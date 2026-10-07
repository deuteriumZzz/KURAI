import { describe, expect, it } from "vitest";
import type { LedgerEntry } from "@/types/api";
import { forecast, monthReceipt, monthSpend, spendDays } from "./spend";

const now = Date.parse("2026-10-02T12:00:00Z");
const e = (at: string, kind: LedgerEntry["kind"], amountMicro: number, model?: string): LedgerEntry => ({ id: `${at}-${amountMicro}`, at, kind, title: "x", amountMicro, ...(model ? { model } : {}) });
const ledger = [
  e("2026-09-30T10:00:00Z", "charge", -30_000, "a"),
  e("2026-10-01T10:00:00Z", "charge", -20_000, "a"),
  e("2026-10-01T11:00:00Z", "refund", 5_000, "a"),
  e("2026-10-02T09:00:00Z", "charge", -40_000, "b"),
  e("2026-10-02T09:30:00Z", "grant", 1_000_000),
];

describe("spend", () => {
  it("counts charges minus refunds per day and per month, ignoring grants", () => {
    const days = spendDays(ledger, now, 3);
    expect(days.map((d) => d.micro)).toEqual([30_000, 15_000, 40_000]);
    expect(monthSpend(ledger, now)).toBe(55_000);
    expect(monthReceipt(ledger, now)).toEqual([{ model: "b", micro: 40_000, runs: 1 }, { model: "a", micro: 15_000, runs: 1 }]);
  });

  it("forecasts only from at least three past runs of the same model", () => {
    expect(forecast(ledger, { model: "a" })).toBeNull();
    const more = [...ledger, e("2026-10-02T10:00:00Z", "charge", -50_000, "a")];
    expect(forecast(more, { model: "a" })).toEqual({ low: 20_000, high: 30_000, points: [20_000, 30_000, 50_000], by: "model" });
  });

  it("falls back to runs of the same mode when the route itself has no history", () => {
    const research = [10_000, 30_000, 20_000].map((v, i) => ({ ...e(`2026-10-0${i + 1}T08:00:00Z`, "charge", -v, `m${i}`), mode: "research" as const }));
    expect(forecast(research, { model: "openrouter/auto", mode: "research" })).toEqual({ low: 10_000, high: 20_000, points: [10_000, 20_000, 30_000], by: "mode" });
  });
});
