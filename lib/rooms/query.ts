import type { GameFilters } from "./filters";

type SearchSource =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function read(source: SearchSource, key: string): string | undefined {
  if (source instanceof URLSearchParams) return source.get(key) ?? undefined;
  const value = source[key];
  return Array.isArray(value) ? value[0] : value;
}

export function parseFilters(source: SearchSource): { minOwners: number | null; filters: GameFilters } {
  const minRaw = read(source, "minOwners");
  const minOwners = minRaw !== undefined && minRaw !== "" ? Number(minRaw) : null;
  const multi = read(source, "multi");
  const hours = Number(read(source, "minHours") ?? "0");
  const genreIds = (read(source, "genres") ?? "")
    .split(",")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  return {
    minOwners: minOwners !== null && Number.isFinite(minOwners) ? minOwners : null,
    filters: {
      multiplayer: multi === undefined || multi === "" ? true : multi === "1",
      coop: read(source, "coop") === "1",
      pvp: read(source, "pvp") === "1",
      freeToPlay: read(source, "f2p") === "1",
      genreIds,
      minHours: Number.isFinite(hours) && hours > 0 ? hours : 0,
    },
  };
}

export function writeFilters(minOwners: number, filters: GameFilters): string {
  const params = new URLSearchParams();
  params.set("minOwners", String(minOwners));
  params.set("multi", filters.multiplayer ? "1" : "0");
  if (filters.coop) params.set("coop", "1");
  if (filters.pvp) params.set("pvp", "1");
  if (filters.freeToPlay) params.set("f2p", "1");
  if (filters.genreIds.length > 0) params.set("genres", filters.genreIds.join(","));
  if (filters.minHours > 0) params.set("minHours", String(filters.minHours));
  return params.toString();
}
