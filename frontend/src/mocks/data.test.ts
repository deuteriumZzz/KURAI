import { describe, expect, it } from "vitest";
import type { Message } from "@/types/api";
import { branchOf } from "./data";

const msg = (id: string, parentId: string | null): Message => ({
  id, parentId, chatId: "c", role: "user", mode: "text", model: null, parts: [], costMicro: 0, createdAt: "2026-09-23T00:00:00Z",
});

describe("branchOf", () => {
  it("walks from head to root in order and ignores other branches", () => {
    const tree = [msg("a", null), msg("b", "a"), msg("c", "b"), msg("b2", "a"), msg("c2", "b2")];
    expect(branchOf("c", tree).map((m) => m.id)).toEqual(["a", "b", "c"]);
    expect(branchOf("c2", tree).map((m) => m.id)).toEqual(["a", "b2", "c2"]);
  });
  it("returns empty for unknown head", () => {
    expect(branchOf("zzz", [])).toEqual([]);
  });
});
