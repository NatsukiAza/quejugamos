export const MULTIPLAYER_CATEGORY_IDS = [1, 9, 20, 27, 36, 37, 38, 39, 48, 49] as const;
export const COOP_CATEGORY_IDS = [9, 38, 39, 48] as const;
export const PVP_CATEGORY_IDS = [36, 37, 49] as const;

export const GENRE_IDS = [1, 2, 3, 4, 9, 18, 23, 25, 28, 29] as const;
export type GenreId = (typeof GENRE_IDS)[number];

const multiplayer = new Set<number>(MULTIPLAYER_CATEGORY_IDS);
const coop = new Set<number>(COOP_CATEGORY_IDS);
const pvp = new Set<number>(PVP_CATEGORY_IDS);
const genres = new Set<number>(GENRE_IDS);

export function overlaps(ids: number[], set: Set<number>): boolean {
  return ids.some((id) => set.has(id));
}

export function isMultiplayer(categoryIds: number[]): boolean {
  return overlaps(categoryIds, multiplayer);
}

export function isCoop(categoryIds: number[]): boolean {
  return overlaps(categoryIds, coop);
}

export function isPvp(categoryIds: number[]): boolean {
  return overlaps(categoryIds, pvp);
}

export function isKnownGenre(id: number): id is GenreId {
  return genres.has(id);
}

export function knownGenres(ids: number[]): GenreId[] {
  return ids.filter(isKnownGenre);
}

export function isListedApp(success: boolean, type: string | null): boolean {
  if (!success) return false;
  if (!type) return true;
  return type === "game";
}
