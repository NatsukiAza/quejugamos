import { describe, expect, it } from "vitest";
import { intersectLibraries } from "./intersection";
import type { IntersectionPlayer } from "./intersection";

const ana: IntersectionPlayer = {
  steamId: "1",
  personaName: "Ana",
  libraryStatus: "ok",
  games: [
    { appid: 10, name: "Alpha", playtimeForever: 60 },
    { appid: 20, name: "Beta", playtimeForever: 30 },
  ],
};

const belen: IntersectionPlayer = {
  steamId: "2",
  personaName: "Belen",
  libraryStatus: "ok",
  games: [
    { appid: 10, name: "Alpha", playtimeForever: 120 },
    { appid: 30, name: "Gamma", playtimeForever: 10 },
  ],
};

describe("intersectLibraries", () => {
  it("keeps a game when enough visible libraries own it and lists who is missing", () => {
    const result = intersectLibraries([ana, belen], 2);
    expect(result.visibleCount).toBe(2);
    expect(result.games.map((game) => game.appId)).toEqual([10]);
    expect(result.games[0]?.playtimeMinutes).toBe(180);
    expect(result.games[0]?.missing).toEqual([]);
  });

  it("excludes private and error libraries from the denominator", () => {
    const result = intersectLibraries(
      [
        ana,
        {
          steamId: "9",
          personaName: "Private",
          libraryStatus: "private",
          games: [],
        },
      ],
      1,
    );
    expect(result.visibleCount).toBe(1);
    expect(result.missingLibraries.map((player) => player.personaName)).toEqual(["Private"]);
    expect(result.games).toHaveLength(2);
    expect(result.games.every((game) => game.missing.length === 0)).toBe(true);
  });

  it("counts an empty public library, so all-owners can be empty", () => {
    const empty: IntersectionPlayer = {
      steamId: "3",
      personaName: "Empty",
      libraryStatus: "ok",
      games: [],
    };
    const all = intersectLibraries([ana, empty], 2);
    expect(all.games).toEqual([]);
    const almost = intersectLibraries([ana, empty], 1);
    expect(almost.games[0]?.missing.map((player) => player.personaName)).toContain("Empty");
  });

  it("sorts by group playtime and then by name", () => {
    const result = intersectLibraries([ana, belen], 1);
    expect(result.games.map((game) => game.name)).toEqual(["Alpha", "Beta", "Gamma"]);
  });
});
