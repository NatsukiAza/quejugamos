import { describe, expect, it } from "vitest";
import { filterCustomGames, filterSteamGames, clampMinOwners, narrowToMinOwners } from "./filters";
import type { SteamListGame } from "./filters";

const pending: SteamListGame = {
  appId: 1,
  name: "Pending",
  playtimeMinutes: 10,
  owners: [],
  missing: [],
  details: null,
};

const shooter: SteamListGame = {
  appId: 2,
  name: "Action Online",
  playtimeMinutes: 120,
  owners: [],
  missing: [],
  details: { categoryIds: [1, 36], genreIds: [1], isFree: false, type: "game" },
};

const coop: SteamListGame = {
  appId: 3,
  name: "Coop",
  playtimeMinutes: 30,
  owners: [],
  missing: [],
  details: { categoryIds: [9, 38], genreIds: [3], isFree: true, type: "game" },
};

describe("filters", () => {
  it("keeps unclassified games while multiplayer is on", () => {
    const result = filterSteamGames([pending, shooter], {
      multiplayer: true,
      coop: false,
      pvp: false,
      freeToPlay: false,
      genreIds: [],
      minHours: 0,
    });
    expect(result.map((game) => game.appId)).toEqual([1, 2]);
  });

  it("hides a classified single-player game when multiplayer is on", () => {
    const single: SteamListGame = {
      ...shooter,
      appId: 4,
      details: { categoryIds: [2], genreIds: [1], isFree: false, type: "game" },
    };
    const result = filterSteamGames([single], {
      multiplayer: true,
      coop: false,
      pvp: false,
      freeToPlay: false,
      genreIds: [],
      minHours: 0,
    });
    expect(result).toEqual([]);
  });

  it("ORs coop and pvp, and ANDs free-to-play", () => {
    const both = filterSteamGames([shooter, coop], {
      multiplayer: false,
      coop: true,
      pvp: true,
      freeToPlay: false,
      genreIds: [],
      minHours: 0,
    });
    expect(both.map((game) => game.appId).sort()).toEqual([2, 3]);

    const free = filterSteamGames([shooter, coop], {
      multiplayer: false,
      coop: false,
      pvp: false,
      freeToPlay: true,
      genreIds: [],
      minHours: 0,
    });
    expect(free.map((game) => game.appId)).toEqual([3]);
  });

  it("filters genres with OR and applies minimum hours", () => {
    const genres = filterSteamGames([shooter, coop], {
      multiplayer: false,
      coop: false,
      pvp: false,
      freeToPlay: false,
      genreIds: [3],
      minHours: 0,
    });
    expect(genres.map((game) => game.appId)).toEqual([3]);

    const hours = filterSteamGames([shooter, coop], {
      multiplayer: false,
      coop: false,
      pvp: false,
      freeToPlay: false,
      genreIds: [],
      minHours: 1,
    });
    expect(hours.map((game) => game.appId)).toEqual([2]);
  });

  it("keeps an untagged custom game when a genre filter is on", () => {
    const games = filterCustomGames(
      [
        { id: "a", name: "Mario Kart", genreIds: [], addedBy: "1" },
        { id: "b", name: "Tagged", genreIds: [1], addedBy: "1" },
      ],
      {
        multiplayer: true,
        coop: false,
        pvp: false,
        freeToPlay: false,
        genreIds: [3],
        minHours: 0,
      },
    );
    expect(games.map((game) => game.id)).toEqual(["a"]);
  });

  it("clamps the owner minimum to the visible libraries", () => {
    expect(clampMinOwners(null, 4)).toBe(4);
    expect(clampMinOwners(0, 4)).toBe(1);
    expect(clampMinOwners(9, 4)).toBe(4);
    expect(clampMinOwners(2, 0)).toBe(0);
  });

  it("narrows a loaded list when the owner minimum goes up", () => {
    const one = {
      ...pending,
      appId: 1,
      owners: [{ steamId: "a", personaName: "A", playtimeMinutes: 1 }],
    };
    const two = {
      ...pending,
      appId: 2,
      owners: [
        { steamId: "a", personaName: "A", playtimeMinutes: 1 },
        { steamId: "b", personaName: "B", playtimeMinutes: 1 },
      ],
    };
    const games = [one, two];
    expect(narrowToMinOwners(games, 2, 1).map((game) => game.appId)).toEqual([2]);
    expect(narrowToMinOwners(games, 1, 1)).toBe(games);
    expect(narrowToMinOwners(games, 1, 2)).toBe(games);
  });
});
