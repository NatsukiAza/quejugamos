import { isCoop, isMultiplayer, isPvp } from "@/lib/steam/categories";

export type AppDetails = {
  categoryIds: number[];
  genreIds: number[];
  isFree: boolean;
  type: string | null;
} | null;

export type SteamListGame = {
  appId: number;
  name: string;
  playtimeMinutes: number;
  owners: { steamId: string; personaName: string; playtimeMinutes: number }[];
  missing: { steamId: string; personaName: string }[];
  details: AppDetails;
};

export type CustomListGame = {
  id: string;
  name: string;
  genreIds: number[];
  addedBy: string;
};

export type GameFilters = {
  multiplayer: boolean;
  coop: boolean;
  pvp: boolean;
  freeToPlay: boolean;
  genreIds: number[];
  minHours: number;
};

export type SelectableGame = {
  id: string;
  kind: "steam" | "custom";
  name: string;
  imageUrl: string | null;
  playtimeMinutes: number;
};

export function clampMinOwners(requested: number | null, visible: number): number {
  if (visible <= 0) return 0;
  if (requested === null || Number.isNaN(requested)) return visible;
  return Math.min(visible, Math.max(1, Math.trunc(requested)));
}

export function shortcutMinOwners(
  shortcut: "all" | "allButOne" | "half",
  visible: number,
): number {
  if (visible <= 0) return 0;
  if (shortcut === "all") return visible;
  if (shortcut === "allButOne") return Math.max(1, visible - 1);
  return Math.max(1, Math.ceil(visible / 2));
}

function genreOverlap(left: number[], right: number[]): boolean {
  return left.some((id) => right.includes(id));
}

export function filterSteamGames(games: SteamListGame[], filters: GameFilters): SteamListGame[] {
  const minMinutes = filters.minHours * 60;
  return games.filter((game) => {
    if (game.playtimeMinutes < minMinutes) return false;
    const details = game.details;
    if (filters.multiplayer) {
      if (details && !isMultiplayer(details.categoryIds)) return false;
    }
    const modeFilters = filters.coop || filters.pvp;
    if (modeFilters) {
      if (!details) return false;
      const matchesCoop = filters.coop && isCoop(details.categoryIds);
      const matchesPvp = filters.pvp && isPvp(details.categoryIds);
      if (!matchesCoop && !matchesPvp) return false;
    }
    if (filters.freeToPlay) {
      if (!details || !details.isFree) return false;
    }
    if (filters.genreIds.length > 0) {
      if (!details || !genreOverlap(details.genreIds, filters.genreIds)) return false;
    }
    return true;
  });
}

export function filterCustomGames(games: CustomListGame[], filters: GameFilters): CustomListGame[] {
  if (filters.genreIds.length === 0) return games;
  return games.filter(
    (game) => game.genreIds.length === 0 || genreOverlap(game.genreIds, filters.genreIds),
  );
}

export function selectionOf(
  steam: SteamListGame[],
  custom: CustomListGame[],
  filters: GameFilters,
  imageFor: (appId: number) => string,
): SelectableGame[] {
  const steamGames = filterSteamGames(steam, filters).map((game) => ({
    id: String(game.appId),
    kind: "steam" as const,
    name: game.name,
    imageUrl: imageFor(game.appId),
    playtimeMinutes: game.playtimeMinutes,
  }));
  const customGames = filterCustomGames(custom, filters).map((game) => ({
    id: `custom:${game.id}`,
    kind: "custom" as const,
    name: game.name,
    imageUrl: null,
    playtimeMinutes: 0,
  }));
  return [...steamGames, ...customGames];
}
