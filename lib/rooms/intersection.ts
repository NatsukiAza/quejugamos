export type OwnedGame = {
  appid: number;
  name: string;
  playtimeForever: number;
};

export type LibraryStatus = "ok" | "private" | "error";

export type IntersectionPlayer = {
  steamId: string;
  personaName: string;
  libraryStatus: LibraryStatus;
  games: OwnedGame[];
};

export type GameOwner = {
  steamId: string;
  personaName: string;
  playtimeMinutes: number;
};

export type IntersectionGame = {
  appId: number;
  name: string;
  playtimeMinutes: number;
  owners: GameOwner[];
  missing: { steamId: string; personaName: string }[];
};

export type MissingLibrary = {
  steamId: string;
  personaName: string;
  libraryStatus: Exclude<LibraryStatus, "ok">;
};

export function intersectLibraries(
  players: IntersectionPlayer[],
  minOwners: number,
): { games: IntersectionGame[]; visibleCount: number; missingLibraries: MissingLibrary[] } {
  const visible = players.filter((player) => player.libraryStatus === "ok");
  const missingLibraries = players
    .filter((player): player is IntersectionPlayer & { libraryStatus: "private" | "error" } => {
      return player.libraryStatus !== "ok";
    })
    .map((player) => ({
      steamId: player.steamId,
      personaName: player.personaName,
      libraryStatus: player.libraryStatus,
    }));

  if (minOwners <= 0 || visible.length === 0) {
    return { games: [], visibleCount: visible.length, missingLibraries };
  }

  const byApp = new Map<
    number,
    { name: string; owners: GameOwner[] }
  >();

  for (const player of visible) {
    const seen = new Map<number, OwnedGame>();
    for (const game of player.games) {
      const current = seen.get(game.appid);
      if (!current || game.playtimeForever > current.playtimeForever) seen.set(game.appid, game);
    }
    for (const game of seen.values()) {
      const entry = byApp.get(game.appid) ?? { name: game.name, owners: [] };
      entry.owners.push({
        steamId: player.steamId,
        personaName: player.personaName,
        playtimeMinutes: game.playtimeForever,
      });
      if (game.playtimeForever >= Math.max(...entry.owners.map((owner) => owner.playtimeMinutes))) {
        entry.name = game.name;
      }
      byApp.set(game.appid, entry);
    }
  }

  const games = [...byApp.entries()]
    .filter(([, entry]) => entry.owners.length >= minOwners)
    .map(([appId, entry]) => {
      const owners = [...entry.owners].sort((a, b) => a.personaName.localeCompare(b.personaName));
      const ownerIds = new Set(owners.map((owner) => owner.steamId));
      const missing = visible
        .filter((player) => !ownerIds.has(player.steamId))
        .map((player) => ({ steamId: player.steamId, personaName: player.personaName }))
        .sort((a, b) => a.personaName.localeCompare(b.personaName));
      return {
        appId,
        name: entry.name,
        playtimeMinutes: owners.reduce((sum, owner) => sum + owner.playtimeMinutes, 0),
        owners,
        missing,
      };
    })
    .sort((a, b) => b.playtimeMinutes - a.playtimeMinutes || a.name.localeCompare(b.name));

  return { games, visibleCount: visible.length, missingLibraries };
}
