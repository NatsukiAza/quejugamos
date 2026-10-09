import "server-only";

export class SteamRequestError extends Error {
  constructor(public kind: "rate_limit" | "network" | "not_found" | "unconfigured") {
    super(kind);
  }
}

export type OwnedGameRecord = {
  appid: number;
  name: string;
  playtimeForever: number;
};

export type OwnedGamesResult =
  | { isPrivate: true; games: [] }
  | { isPrivate: false; games: OwnedGameRecord[] };

export type PlayerSummary = {
  steamId: string;
  personaName: string;
  avatarUrl: string;
};

export type AppDetailsRecord = {
  name: string;
  type: string | null;
  isFree: boolean;
  categoryIds: number[];
  genreIds: number[];
  success: boolean;
};

const API = "https://api.steampowered.com";
const USER_AGENT = "QueJugamos/0.1";

function apiKey(): string {
  const key = process.env.STEAM_API_KEY;
  if (!key) throw new SteamRequestError("unconfigured");
  return key;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(url: URL, init?: RequestInit): Promise<Response> {
  let last: SteamRequestError = new SteamRequestError("network");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        headers: {
          accept: "application/json",
          "user-agent": USER_AGENT,
          ...init?.headers,
        },
      });
      if (response.status === 429 || response.status >= 500) {
        last = new SteamRequestError(response.status === 429 ? "rate_limit" : "network");
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      return response;
    } catch {
      last = new SteamRequestError("network");
      await sleep(1000 * 2 ** attempt);
    }
  }
  throw last;
}

export async function resolveVanity(vanity: string): Promise<string> {
  const url = new URL(`${API}/ISteamUser/ResolveVanityURL/v1/`);
  url.searchParams.set("key", apiKey());
  url.searchParams.set("vanityurl", vanity);
  const response = await request(url);
  const body = (await response.json()) as { response?: { success?: number; steamid?: string } };
  if (body.response?.success === 1 && body.response.steamid) return body.response.steamid;
  throw new SteamRequestError("not_found");
}

export async function getPlayerSummary(steamId: string): Promise<PlayerSummary> {
  const url = new URL(`${API}/ISteamUser/GetPlayerSummaries/v2/`);
  url.searchParams.set("key", apiKey());
  url.searchParams.set("steamids", steamId);
  const response = await request(url);
  const body = (await response.json()) as {
    response?: { players?: { steamid?: string; personaname?: string; avatarfull?: string }[] };
  };
  const player = body.response?.players?.[0];
  if (!player?.steamid) throw new SteamRequestError("not_found");
  return {
    steamId: player.steamid,
    personaName: player.personaname || steamId,
    avatarUrl: player.avatarfull || "",
  };
}

export async function getOwnedGames(steamId: string, language: string): Promise<OwnedGamesResult> {
  const url = new URL(`${API}/IPlayerService/GetOwnedGames/v1/`);
  url.searchParams.set("key", apiKey());
  url.searchParams.set("steamid", steamId);
  url.searchParams.set("include_appinfo", "1");
  url.searchParams.set("include_played_free_games", "1");
  url.searchParams.set("l", language);
  const response = await request(url);
  const body = (await response.json()) as {
    response?: { game_count?: number; games?: { appid?: number; name?: string; playtime_forever?: number }[] };
  };
  const payload = body.response;
  if (!payload || (!("game_count" in payload) && !("games" in payload))) {
    return { isPrivate: true, games: [] };
  }
  const games = (payload.games ?? []).flatMap((game) => {
    if (!game.appid) return [];
    return [
      {
        appid: game.appid,
        name: game.name || String(game.appid),
        playtimeForever: game.playtime_forever ?? 0,
      },
    ];
  });
  return { isPrivate: false, games };
}

export async function getAppDetails(appId: number): Promise<AppDetailsRecord> {
  const url = new URL("https://store.steampowered.com/api/appdetails");
  url.searchParams.set("appids", String(appId));
  url.searchParams.set("l", "english");
  const response = await request(url);
  const body = (await response.json()) as Record<
    string,
    {
      success?: boolean;
      data?: {
        name?: string;
        type?: string;
        is_free?: boolean;
        categories?: { id?: number }[];
        genres?: { id?: string | number }[];
      };
    }
  >;
  const entry = body[String(appId)];
  if (!entry?.success || !entry.data) {
    return {
      name: String(appId),
      type: null,
      isFree: false,
      categoryIds: [],
      genreIds: [],
      success: false,
    };
  }
  return {
    name: entry.data.name || String(appId),
    type: entry.data.type ?? null,
    isFree: Boolean(entry.data.is_free),
    categoryIds: (entry.data.categories ?? []).flatMap((category) =>
      typeof category.id === "number" ? [category.id] : [],
    ),
    genreIds: (entry.data.genres ?? []).flatMap((genre) => {
      const id = Number(genre.id);
      return Number.isInteger(id) ? [id] : [];
    }),
    success: true,
  };
}
