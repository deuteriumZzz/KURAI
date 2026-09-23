import { describe, expect, it } from "vitest";
import type { ChatSummary } from "@/types/api";
import { formatCredits, groupChats } from "./format";

// ru-RU группирует разряды неразрывным пробелом
const nb = (s: string) => s.replace(/ /g, " ");

describe("formatCredits", () => {
  it("formats large balances without fraction", () => {
    expect(formatCredits(12_480_000)).toBe(nb("1 248") + " кр");
  });
  it("keeps one decimal below 100 credits", () => {
    expect(formatCredits(78_000)).toBe("7,8 кр");
    expect(formatCredits(4_000)).toBe("0,4 кр");
    expect(formatCredits(20_000)).toBe("2 кр");
  });
  it("supports approx and no unit", () => {
    expect(formatCredits(20_000, { approx: true })).toBe("≈ 2 кр");
    expect(formatCredits(20_000, { unit: false })).toBe("2");
  });
});

describe("groupChats", () => {
  const now = new Date("2026-09-23T15:00:00Z");
  const chat = (id: string, updatedAt: string, pinned = false): ChatSummary => ({
    id,
    title: id,
    updatedAt,
    pinned,
    headId: `${id}-h`,
  });

  it("buckets by day with pinned first and newest first", () => {
    const groups = groupChats(
      [
        chat("old", "2026-08-01T10:00:00Z"),
        chat("today-early", "2026-09-23T08:00:00Z"),
        chat("today-late", "2026-09-23T14:00:00Z"),
        chat("yesterday", "2026-09-22T12:00:00Z"),
        chat("week", "2026-09-18T12:00:00Z"),
        chat("pin", "2026-07-01T12:00:00Z", true),
      ],
      now,
    );
    expect(groups.map((g) => g.label)).toEqual(["Закреплённые", "Сегодня", "Вчера", "Неделя", "Ранее"]);
    expect(groups[1]?.chats.map((c) => c.id)).toEqual(["today-late", "today-early"]);
  });

  it("drops empty groups", () => {
    expect(groupChats([], now)).toEqual([]);
  });
});
