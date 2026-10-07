import { describe, expect, it } from "vitest";
import { wordDiff } from "./diff";

describe("wordDiff", () => {
  it("marks a replaced word as removed and added, keeps the rest", () => {
    expect(wordDiff("рынок кофеен Казани", "рынок чайных Казани")).toEqual([
      { kind: "same", text: "рынок " },
      { kind: "del", text: "кофеен" },
      { kind: "add", text: "чайных" },
      { kind: "same", text: " Казани" },
    ]);
  });

  it("reassembles both versions exactly", () => {
    const before = "Шаг 1. Собрать данные.\nШаг 2. Проверить.";
    const after = "Шаг 1. Собрать свежие данные.\nШаг 3. Запустить.";
    const parts = wordDiff(before, after)!;
    expect(parts.filter((p) => p.kind !== "add").map((p) => p.text).join("")).toBe(before);
    expect(parts.filter((p) => p.kind !== "del").map((p) => p.text).join("")).toBe(after);
  });
});
