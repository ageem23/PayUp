/**
 * @jest-environment node
 */
import {
  parseParticipantInput,
  addParticipants,
  receiptsReferencingParticipant,
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

describe("receiptsReferencingParticipant", () => {
  const receipts = [
    {
      name: "Dinner",
      paid_by: "Alice",
      split_among: [{ assigned_participants: ["Alice", "Bob"] }],
    },
    { name: "Lunch", paid_by: "Bob", split_among: [] },
    {
      name: null,
      paid_by: "Carol",
      split_among: [{ assigned_participants: ["Dave"] }],
    },
  ];

  it("flags receipts where the name is the payer or a split assignee", () => {
    expect(receiptsReferencingParticipant("Bob", receipts)).toEqual([
      "Dinner",
      "Lunch",
    ]);
  });

  it("falls back to 'Untitled receipt' for a nameless receipt", () => {
    expect(receiptsReferencingParticipant("Dave", receipts)).toEqual([
      "Untitled receipt",
    ]);
  });

  it("returns empty when the name is unreferenced", () => {
    expect(receiptsReferencingParticipant("Zoe", receipts)).toEqual([]);
  });

  it("matches case-insensitively (receipt 'alice' still blocks removing 'Alice')", () => {
    const mixed = [
      {
        name: "Brunch",
        paid_by: "alice",
        split_among: [{ assigned_participants: ["BOB"] }],
      },
    ];
    expect(receiptsReferencingParticipant("Alice", mixed)).toEqual(["Brunch"]);
    expect(receiptsReferencingParticipant("bob", mixed)).toEqual(["Brunch"]);
  });
});
