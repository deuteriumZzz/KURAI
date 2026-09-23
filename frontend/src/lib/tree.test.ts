import { describe, expect, it } from "vitest";
import type { Message } from "@/types/api";
import { branchOf, leafOf, siblingsOf } from "./tree";

let t = 0;
const msg = (id: string, parentId: string | null, role: Message["role"] = "user"): Message => ({
  id, parentId, role, chatId: "c", mode: "text", model: null, parts: [], costMicro: 0,
  createdAt: new Date(Date.UTC(2026, 8, 23, 0, 0, t++)).toISOString(),
});

// a(user) → b(asst) → c(user)   ;   a → b2(asst, regenerate) → c2(user) → d2(asst)
const tree = [
  msg("a", null), msg("b", "a", "assistant"), msg("c", "b"),
  msg("b2", "a", "assistant"), msg("c2", "b2"), msg("d2", "c2", "assistant"),
];

describe("branchOf", () => {
  it("walks from head to root and ignores other branches", () => {
    expect(branchOf("c", tree).map((m) => m.id)).toEqual(["a", "b", "c"]);
    expect(branchOf("d2", tree).map((m) => m.id)).toEqual(["a", "b2", "c2", "d2"]);
    expect(branchOf("zzz", tree)).toEqual([]);
  });
});

describe("siblingsOf", () => {
  it("returns versions of the same answer in creation order", () => {
    expect(siblingsOf("b2", tree).map((m) => m.id)).toEqual(["b", "b2"]);
    expect(siblingsOf("d2", tree).map((m) => m.id)).toEqual(["d2"]);
  });
});

describe("leafOf", () => {
  it("descends to the newest leaf", () => {
    expect(leafOf("b", tree)).toBe("c");
    expect(leafOf("b2", tree)).toBe("d2");
    expect(leafOf("d2", tree)).toBe("d2");
  });
});
