import { describe, expect, it } from "vitest";
import { parseSteamInput } from "./parse-input";

describe("parseSteamInput", () => {
  it("accepts a bare SteamID64", () => {
    expect(parseSteamInput("76561198000000000")).toEqual({
      type: "id",
      steamId: "76561198000000000",
    });
  });

  it("accepts a profiles URL", () => {
    expect(parseSteamInput("https://steamcommunity.com/profiles/76561198000000000/")).toEqual({
      type: "id",
      steamId: "76561198000000000",
    });
  });

  it("accepts a vanity URL and a bare vanity", () => {
    expect(parseSteamInput("steamcommunity.com/id/Some-Name")).toEqual({
      type: "vanity",
      vanity: "Some-Name",
    });
    expect(parseSteamInput("Some-Name")).toEqual({ type: "vanity", vanity: "Some-Name" });
  });

  it("rejects empty and malformed input", () => {
    expect(parseSteamInput("  ")).toBeNull();
    expect(parseSteamInput("nope/slash")).toBeNull();
    expect(parseSteamInput("123")).toBeNull();
  });
});
