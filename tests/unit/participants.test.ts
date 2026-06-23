/**
 * @jest-environment node
 */
import {
  parseParticipantInput,
  addParticipants,
} from "@/utils/participants";

describe("parseParticipantInput", () => {
  it("splits on whitespace, trims, and drops empties", () => {
    expect(parseParticipantInput("  Alice   Bob  Carol ")).toEqual([
      "Alice",
      "Bob",
      "Carol",
    ]);
    expect(parseParticipantInput("   ")).toEqual([]);
    expect(parseParticipantInput("")).toEqual([]);
  });

  it("splits a multi-word name into tokens (by design)", () => {
    expect(parseParticipantInput("Mary Anne")).toEqual(["Mary", "Anne"]);
  });
});

describe("addParticipants", () => {
  it("appends new names, de-duplicating case-insensitively (existing wins)", () => {
    expect(addParticipants(["Alice"], ["bob", "ALICE", "Bob"])).toEqual([
      "Alice",
      "bob",
    ]);
  });

  it("returns a new array and preserves order", () => {
    const existing = ["Alice"];
    const result = addParticipants(existing, ["Bob"]);
    expect(result).toEqual(["Alice", "Bob"]);
    expect(result).not.toBe(existing);
  });

  it("is a no-op for an empty incoming list", () => {
    expect(addParticipants(["Alice"], [])).toEqual(["Alice"]);
  });
});
