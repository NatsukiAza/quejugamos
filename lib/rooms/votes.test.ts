import { describe, expect, it } from "vitest";
import { tallyVote } from "./votes";

describe("tallyVote", () => {
  it("counts only people who can vote", () => {
    const tally = tallyVote(["a", "b"], { a: { "10": "yes" }, pasted: { "10": "yes" } }, "10");
    expect(tally).toMatchObject({ yes: 1, pending: 1, unanimous: false, majority: false });
  });

  it("is unanimous only when every voter said yes", () => {
    expect(tallyVote(["a", "b"], { a: { "10": "yes" }, b: { "10": "yes" } }, "10").unanimous).toBe(
      true,
    );
    expect(tallyVote(["a"], { a: { "10": "no" } }, "10").unanimous).toBe(false);
  });

  it("needs more than half for a majority", () => {
    expect(tallyVote(["a", "b"], { a: { "10": "yes" } }, "10").majority).toBe(false);
    expect(tallyVote(["a", "b", "c"], { a: { "10": "yes" }, b: { "10": "yes" } }, "10").majority).toBe(
      true,
    );
    expect(tallyVote([], {}, "10").majority).toBe(false);
  });
});
