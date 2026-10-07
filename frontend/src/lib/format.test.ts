import { describe, expect, it } from "vitest";
import type { ChatSummary } from "@/types/api";
import { formatBytes, formatCredits, formatWhen, groupChats, hostOf, webHref } from "./format";

// ru-RU группирует разряды неразрывным пробелом
const nb = (s: string) => s.replace(/ /g, " ");

describe("formatCredits", () => {
  it("formats large balances without fraction", () => {
    expect(formatCredits(12_480_000)).toBe(nb("1 248") + "\u00a0кр");
  });
  it("keeps one decimal below 100 credits", () => {
    expect(formatCredits(78_000)).toBe("7,8\u00a0кр");
    expect(formatCredits(4_000)).toBe("0,4\u00a0кр");
    expect(formatCredits(20_000)).toBe("2\u00a0кр");
  });
  it("supports approx and no unit", () => {
    expect(formatCredits(20_000, { approx: true })).toBe("≈\u00a02\u00a0кр");
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

describe("formatBytes", () => {
  it("picks unit and keeps one decimal below 10", () => {
    expect(formatBytes(2.1 * 1024 ** 3)).toBe("2,1 ГБ");
    expect(formatBytes(180 * 1024 ** 2)).toBe("180 МБ");
    expect(formatBytes(5 * 1024 ** 3)).toBe("5 ГБ");
    expect(formatBytes(512)).toBe("512 Б");
  });
});

describe("formatWhen", () => {
  const now = new Date("2026-09-23T15:00:00Z");
  it("names today and yesterday, dates older rows", () => {
    expect(formatWhen("2026-09-23T12:24:00Z", now)).toBe("Сегодня, 12:24");
    expect(formatWhen("2026-09-22T18:10:00Z", now)).toBe("Вчера, 18:10");
    expect(formatWhen("2026-09-02T16:20:00Z", now)).toMatch(/^2 сент\.?, 16:20$/);
  });
});

describe("hostOf / webHref", () => {
  it("never throws on a malformed source and only allows http(s) links", () => {
    expect(hostOf("https://www.habr.com/ru/")).toBe("habr.com");
    expect(hostOf("не адрес")).toBe("не адрес");
    expect(webHref("https://vc.ru/x")).toBe("https://vc.ru/x");
    expect(webHref("javascript:alert(1)")).toBeUndefined();
    expect(webHref("не адрес")).toBeUndefined();
  });
});
