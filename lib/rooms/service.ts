import "server-only";

import { getLocale } from "next-intl/server";
import { steamLanguage } from "@/i18n/locales";
import { makeCustomId, makeRoomCode } from "@/lib/rooms/code";
import { clampMinOwners } from "@/lib/rooms/filters";
import { intersectLibraries } from "@/lib/rooms/intersection";
import type { CustomListGame, SteamListGame } from "@/lib/rooms/filters";
import type {
  GamesPayload,
  RoomPlayer,
  RoomRecord,
  Viewer,
} from "@/lib/rooms/types";
import type { Session } from "@/lib/session";
import { getSession } from "@/lib/session";
import { isListedApp, knownGenres } from "@/lib/steam/categories";
import {
  getAppDetails,
  getOwnedGames,
  getPlayerSummary,
  resolveVanity,
  SteamRequestError,
  type AppDetailsRecord,
  type OwnedGameRecord,
} from "@/lib/steam/client";
import { parseSteamInput } from "@/lib/steam/parse-input";
import {
  APP_FAILURE_TTL_SECONDS,
  APP_SUCCESS_TTL_SECONDS,
  AppError,
  LIBRARY_TTL_SECONDS,
  MAX_PLAYERS,
  ROOM_TTL_SECONDS,
  redis,
} from "@/lib/store/redis";

type LibraryCache = {
  games: OwnedGameRecord[];
  isPrivate: boolean;
  fetchedAt: number;
  language: string;
};

type AppCache = AppDetailsRecord & { fetchedAt: number };

type VoteValue = "yes" | "no";

function libraryKey(steamId: string) {
  return `library:${steamId}`;
}

function appKey(appId: number) {
  return `app:${appId}`;
}

function roomKey(code: string) {
  return `room:${code}`;
}

function lockKey(code: string) {
  return `lock:room:${code}`;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new AppError(401, "unauthorized");
  return session;
}

async function currentLanguage(): Promise<string> {
  return steamLanguage(await getLocale());
}

export async function loadLibrary(
  steamId: string,
  options?: { force?: boolean },
): Promise<
  | { status: "ok"; games: OwnedGameRecord[] }
  | { status: "private"; games: [] }
  | { status: "error"; games: []; libraryError: "rate_limit" | "network" | "unconfigured" }
> {
  const language = await currentLanguage();
  const store = redis();
  if (!options?.force) {
    const cached = await store.get<LibraryCache>(libraryKey(steamId));
    if (cached && cached.language === language) {
      return cached.isPrivate
        ? { status: "private", games: [] }
        : { status: "ok", games: cached.games };
    }
  }

  try {
    const owned = await getOwnedGames(steamId, language);
    const cache: LibraryCache = {
      games: owned.games,
      isPrivate: owned.isPrivate,
      fetchedAt: Date.now(),
      language,
    };
    await store.set(libraryKey(steamId), cache, { ex: LIBRARY_TTL_SECONDS });
    return owned.isPrivate
      ? { status: "private", games: [] }
      : { status: "ok", games: owned.games };
  } catch (error) {
    const kind =
      error instanceof SteamRequestError &&
      (error.kind === "rate_limit" || error.kind === "unconfigured")
        ? error.kind
        : "network";
    return { status: "error", games: [], libraryError: kind };
  }
}

function playerFromLibrary(
  summary: { steamId: string; personaName: string; avatarUrl: string },
  library: Awaited<ReturnType<typeof loadLibrary>>,
  canVote: boolean,
): RoomPlayer {
  return {
    steamId: summary.steamId,
    personaName: summary.personaName,
    avatarUrl: summary.avatarUrl,
    libraryStatus: library.status,
    libraryError: library.status === "error" ? library.libraryError : null,
    canVote,
    gameCount: library.status === "ok" ? library.games.length : null,
  };
}

export async function readRoom(code: string): Promise<RoomRecord | null> {
  return redis().get<RoomRecord>(roomKey(code));
}

async function writeRoom(room: RoomRecord): Promise<void> {
  await redis().set(roomKey(room.code), room, { ex: ROOM_TTL_SECONDS });
}

async function updateRoom(code: string, mutate: (room: RoomRecord) => RoomRecord): Promise<RoomRecord> {
  const store = redis();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const locked = await store.set(lockKey(code), "1", { nx: true, ex: 5 });
    if (!locked) {
      await sleep(40 * (attempt + 1));
      continue;
    }
    try {
      const room = await readRoom(code);
      if (!room) throw new AppError(404, "room_not_found");
      const next = mutate(room);
      await writeRoom(next);
      return next;
    } finally {
      await store.del(lockKey(code));
    }
  }
  throw new AppError(503, "room_busy");
}

async function freshCode(): Promise<string> {
  const store = redis();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeRoomCode();
    const existing = await store.get(roomKey(code));
    if (!existing) return code;
  }
  throw new AppError(503, "code_exhausted");
}

export async function createRoom(session: Session): Promise<RoomRecord> {
  const summary = await getPlayerSummary(session.steamId).catch(() => ({
    steamId: session.steamId,
    personaName: session.personaName,
    avatarUrl: session.avatarUrl,
  }));
  const library = await loadLibrary(summary.steamId, { force: true });
  const room: RoomRecord = {
    code: await freshCode(),
    hostSteamId: summary.steamId,
    createdAt: Date.now(),
    players: [playerFromLibrary(summary, library, true)],
    customGames: [],
    votes: {},
  };
  await writeRoom(room);
  return room;
}

export function viewerOf(room: RoomRecord, session: Session | null): Viewer {
  const player = session ? room.players.find((item) => item.steamId === session.steamId) : undefined;
  return {
    steamId: session?.steamId ?? null,
    isHost: session?.steamId === room.hostSteamId,
    isMember: Boolean(player),
    canVote: Boolean(player?.canVote),
  };
}

export async function joinRoom(code: string, session: Session): Promise<RoomRecord> {
  const summary = await getPlayerSummary(session.steamId).catch(() => ({
    steamId: session.steamId,
    personaName: session.personaName,
    avatarUrl: session.avatarUrl,
  }));
  const library = await loadLibrary(summary.steamId, { force: true });
  return updateRoom(code, (room) => {
    const existing = room.players.find((player) => player.steamId === summary.steamId);
    if (!existing && room.players.length >= MAX_PLAYERS) throw new AppError(409, "room_full");
    const nextPlayer = playerFromLibrary(summary, library, true);
    const players = existing
      ? room.players.map((player) => (player.steamId === summary.steamId ? nextPlayer : player))
      : [...room.players, nextPlayer];
    return { ...room, players };
  });
}

export async function addPastedPlayer(code: string, session: Session, input: string): Promise<RoomRecord> {
  const room = await readRoom(code);
  if (!room) throw new AppError(404, "room_not_found");
  if (room.hostSteamId !== session.steamId) throw new AppError(403, "host_only");
  const parsed = parseSteamInput(input);
  if (!parsed) throw new AppError(400, "invalid_profile");
  const steamId = parsed.type === "id" ? parsed.steamId : await resolveVanity(parsed.vanity);
  if (room.players.some((player) => player.steamId === steamId)) throw new AppError(409, "already_in_room");
  if (room.players.length >= MAX_PLAYERS) throw new AppError(409, "room_full");
  const summary = await getPlayerSummary(steamId);
  const library = await loadLibrary(steamId, { force: true });
  return updateRoom(code, (current) => {
    if (current.players.some((player) => player.steamId === steamId)) {
      throw new AppError(409, "already_in_room");
    }
    if (current.players.length >= MAX_PLAYERS) throw new AppError(409, "room_full");
    return {
      ...current,
      players: [...current.players, playerFromLibrary(summary, library, false)],
    };
  });
}

function nextHost(room: RoomRecord, leavingId: string): string {
  const remaining = room.players.filter((player) => player.steamId !== leavingId);
  return remaining.find((player) => player.canVote)?.steamId ?? remaining[0]?.steamId ?? room.hostSteamId;
}

export async function removePlayer(code: string, session: Session, steamId: string): Promise<void> {
  const room = await readRoom(code);
  if (!room) throw new AppError(404, "room_not_found");
  const target = room.players.find((player) => player.steamId === steamId);
  if (!target) throw new AppError(404, "player_not_found");
  const isSelf = session.steamId === steamId && target.canVote;
  const isHost = session.steamId === room.hostSteamId;
  if (!isSelf && !isHost) throw new AppError(403, "forbidden");

  if (room.players.length === 1) {
    await redis().del(roomKey(code));
    return;
  }

  await updateRoom(code, (current) => {
    const votes = { ...(current.votes ?? {}) };
    delete votes[steamId];
    return {
      ...current,
      hostSteamId: current.hostSteamId === steamId ? nextHost(current, steamId) : current.hostSteamId,
      players: current.players.filter((player) => player.steamId !== steamId),
      votes,
    };
  });
}

export async function refreshPlayer(code: string, session: Session, steamId: string): Promise<RoomRecord> {
  const room = await readRoom(code);
  if (!room) throw new AppError(404, "room_not_found");
  const target = room.players.find((player) => player.steamId === steamId);
  if (!target) throw new AppError(404, "player_not_found");
  const isSelf = session.steamId === steamId;
  const hostRefreshingLibraryOnly = session.steamId === room.hostSteamId && !target.canVote;
  if (!isSelf && !hostRefreshingLibraryOnly) throw new AppError(403, "forbidden");

  const summary = await getPlayerSummary(steamId).catch(() => ({
    steamId,
    personaName: target.personaName,
    avatarUrl: target.avatarUrl,
  }));
  const library = await loadLibrary(steamId, { force: true });
  return updateRoom(code, (current) => ({
    ...current,
    players: current.players.map((player) =>
      player.steamId === steamId ? playerFromLibrary(summary, library, player.canVote) : player,
    ),
  }));
}

export async function addCustomGame(
  code: string,
  session: Session,
  name: string,
  genreIds: number[],
): Promise<RoomRecord> {
  return updateRoom(code, (room) => {
    const member = room.players.find((player) => player.steamId === session.steamId && player.canVote);
    if (!member) throw new AppError(403, "forbidden");
    return {
      ...room,
      customGames: [
        ...room.customGames,
        { id: makeCustomId(), name, genreIds: knownGenres(genreIds), addedBy: session.steamId },
      ],
    };
  });
}

export async function removeCustomGame(code: string, session: Session, id: string): Promise<RoomRecord> {
  return updateRoom(code, (room) => {
    const member = room.players.find((player) => player.steamId === session.steamId && player.canVote);
    if (!member) throw new AppError(403, "forbidden");
    return { ...room, customGames: room.customGames.filter((game) => game.id !== id) };
  });
}

async function librariesFor(room: RoomRecord) {
  return Promise.all(
    room.players.map(async (player) => {
      if (player.libraryStatus !== "ok") {
        return {
          steamId: player.steamId,
          personaName: player.personaName,
          libraryStatus: player.libraryStatus,
          games: [],
        };
      }
      const loaded = await loadLibrary(player.steamId);
      return {
        steamId: player.steamId,
        personaName: player.personaName,
        libraryStatus: loaded.status,
        games: loaded.status === "ok" ? loaded.games : [],
      };
    }),
  );
}

export async function buildGames(room: RoomRecord, requestedMinOwners: number | null): Promise<GamesPayload> {
  const libraries = await librariesFor(room);
  const visibleCount = libraries.filter((player) => player.libraryStatus === "ok").length;
  const minOwners = clampMinOwners(requestedMinOwners, visibleCount);
  const intersection = intersectLibraries(libraries, Math.max(minOwners, 1));
  const games = minOwners === 0 ? [] : intersection.games;
  const appIds = games.map((game) => game.appId);
  const cached = appIds.length
    ? await redis().mget<(AppCache | null)[]>(...appIds.map(appKey))
    : [];

  const steamGames: SteamListGame[] = [];
  const pendingAppIds: number[] = [];
  games.forEach((game, index) => {
    const meta = cached[index];
    if (meta) {
      if (!isListedApp(meta.success, meta.type)) return;
      steamGames.push({
        appId: game.appId,
        name: game.name,
        playtimeMinutes: game.playtimeMinutes,
        owners: game.owners,
        missing: game.missing,
        details: {
          categoryIds: meta.categoryIds,
          genreIds: meta.genreIds,
          isFree: meta.isFree,
          type: meta.type,
        },
      });
      return;
    }
    pendingAppIds.push(game.appId);
    steamGames.push({
      appId: game.appId,
      name: game.name,
      playtimeMinutes: game.playtimeMinutes,
      owners: game.owners,
      missing: game.missing,
      details: null,
    });
  });

  const errorById = new Map(room.players.map((player) => [player.steamId, player.libraryError]));
  const customGames: CustomListGame[] = room.customGames.map((game) => ({
    id: game.id,
    name: game.name,
    genreIds: game.genreIds,
    addedBy: game.addedBy,
  }));

  return {
    visibleCount,
    playerCount: room.players.length,
    minOwners,
    missingLibraries: intersection.missingLibraries.map((player) => ({
      ...player,
      libraryError: errorById.get(player.steamId) ?? null,
    })),
    games: steamGames,
    customGames,
    pendingAppIds,
  };
}

export async function hydrateMetadata(room: RoomRecord, appIds: number[]) {
  const libraries = await librariesFor(room);
  const allowed = new Set<number>();
  for (const library of libraries) {
    for (const game of library.games) allowed.add(game.appid);
  }
  const unique = [...new Set(appIds)].filter((id) => allowed.has(id)).slice(0, 8);
  const store = redis();
  const apps: (AppDetailsRecord & { appId: number })[] = [];
  let rateLimited = false;

  for (const appId of unique) {
    const existing = await store.get<AppCache>(appKey(appId));
    if (existing) {
      apps.push({ appId, ...existing });
      continue;
    }
    try {
      const details = await getAppDetails(appId);
      const cache: AppCache = { ...details, fetchedAt: Date.now() };
      await store.set(appKey(appId), cache, {
        ex: details.success ? APP_SUCCESS_TTL_SECONDS : APP_FAILURE_TTL_SECONDS,
      });
      apps.push({ appId, ...details });
      await sleep(200);
    } catch (error) {
      if (error instanceof SteamRequestError && error.kind === "rate_limit") {
        rateLimited = true;
        break;
      }
      throw error;
    }
  }

  return { apps, rateLimited };
}

export async function readVotes(room: RoomRecord): Promise<Record<string, Record<string, VoteValue>>> {
  const stored = room.votes ?? {};
  const votes: Record<string, Record<string, VoteValue>> = {};
  for (const player of room.players) {
    if (!player.canVote) continue;
    votes[player.steamId] = stored[player.steamId] ?? {};
  }
  return votes;
}

export async function writeVote(
  code: string,
  session: Session,
  appId: string,
  value: VoteValue,
): Promise<void> {
  const room = await readRoom(code);
  if (!room) throw new AppError(404, "room_not_found");
  const player = room.players.find((item) => item.steamId === session.steamId);
  if (!player?.canVote) throw new AppError(403, "forbidden");

  if (appId.startsWith("custom:")) {
    const id = appId.slice("custom:".length);
    if (!room.customGames.some((game) => game.id === id)) throw new AppError(400, "unknown_game");
  } else {
    const numeric = Number(appId);
    if (!Number.isInteger(numeric) || numeric <= 0) throw new AppError(400, "unknown_game");
    const libraries = await librariesFor(room);
    const owned = libraries.some((library) => library.games.some((game) => game.appid === numeric));
    if (!owned) throw new AppError(400, "unknown_game");
  }

  await updateRoom(code, (current) => {
    const currentPlayer = current.players.find((item) => item.steamId === session.steamId);
    if (!currentPlayer?.canVote) throw new AppError(403, "forbidden");
    if (appId.startsWith("custom:")) {
      const id = appId.slice("custom:".length);
      if (!current.customGames.some((game) => game.id === id)) throw new AppError(400, "unknown_game");
    }
    return {
      ...current,
      votes: {
        ...(current.votes ?? {}),
        [session.steamId]: {
          ...(current.votes?.[session.steamId] ?? {}),
          [appId]: value,
        },
      },
    };
  });
}
