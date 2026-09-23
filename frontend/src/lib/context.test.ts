import { describe, expect, it } from "vitest";
import { contextUsage, estimateTokens } from "./context";

describe("context", () => {
  it("estimates tokens from characters", () => {
    expect(estimateTokens(0)).toBe(0);
    expect(estimateTokens(7)).toBe(2);
  });
  it("returns share of model context, capped at 1", () => {
    expect(contextUsage(3500 * 64, 128)).toBeCloseTo(0.5);
    expect(contextUsage(10 ** 9, 128)).toBe(1);
    expect(contextUsage(1000, 0)).toBe(0);
  });
});
