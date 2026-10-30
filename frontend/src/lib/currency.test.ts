import { describe, expect, it } from "vitest";
import { convertUsd, currencyFor, formatMoney, niceAmount, regionOf, type Rates } from "./currency";

const RATES: Rates = { base: "USD", rates: { USD: 1, RUB: 80, EUR: 0.9 }, updatedAt: "" };

describe("currencyFor", () => {
  it("picks the currency of the browser region", () => {
    expect(currencyFor("ru-RU", "auto", RATES)).toBe("RUB");
    expect(currencyFor("de-DE", "auto", RATES)).toBe("EUR");
    expect(currencyFor("en-US", "auto", RATES)).toBe("USD");
  });
  it("infers the region from a bare language", () => {
    expect(regionOf("ru")).toBe("RU");
  });
  it("falls back to dollars when there is no rate for the wanted currency", () => {
    expect(currencyFor("ru-RU", "auto", null)).toBe("USD");
    expect(currencyFor("kk-KZ", "auto", RATES)).toBe("USD");
  });
  it("respects an explicit choice when a rate exists", () => {
    expect(currencyFor("ru-RU", "EUR", RATES)).toBe("EUR");
    expect(currencyFor("ru-RU", "XYZ", RATES)).toBe("USD");
  });
});

describe("convertUsd", () => {
  it("multiplies by the live rate and never invents one", () => {
    expect(convertUsd(10, "RUB", RATES)).toBe(800);
    expect(convertUsd(10, "RUB", null)).toBe(10);
    expect(convertUsd(10, "USD", RATES)).toBe(10);
  });
});

describe("formatMoney", () => {
  it("shows cents for small amounts and whole units for large ones", () => {
    expect(formatMoney(9.9, "USD", "en-US")).toBe("$9.90");
    expect(formatMoney(792, "RUB", "ru-RU").replace(/\s/g, " ")).toContain("790");
  });
});

describe("niceAmount", () => {
  it("keeps small sums exact and rounds larger ones to a friendly step", () => {
    expect(niceAmount(9.9)).toBe(9.9);
    expect(niceAmount(47.4)).toBe(47);
    expect(niceAmount(987.43)).toBe(990);
    expect(niceAmount(4_512)).toBe(4_500);
    expect(niceAmount(45_190)).toBe(45_200);
  });
});
