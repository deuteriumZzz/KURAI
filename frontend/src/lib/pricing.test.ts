import { describe, expect, it } from "vitest";
import { bestPlan, estimateMicro, planPrice } from "./pricing";

describe("estimateMicro", () => {
  it("sums units in integer micro", () => {
    expect(estimateMicro({ texts: 100, images: 50, videos: 2 })).toBe(100 * 20_000 + 50 * 40_000 + 2 * 1_200_000);
  });
});

describe("planPrice", () => {
  it("applies 15% annual discount rounding down", () => {
    expect(planPrice(990, false)).toBe(990);
    expect(planPrice(990, true)).toBe(841);
    expect(planPrice(0, true)).toBe(0);
  });
});

describe("bestPlan", () => {
  it("stays on Free for tiny usage", () => {
    expect(bestPlan({ texts: 2, images: 0, videos: 0 })).toEqual({ plan: "free", totalRub: 0, topUpRub: 0 });
  });
  it("Free + top-up is cheaper than Pro below ~995 credits", () => {
    expect(bestPlan({ texts: 200, images: 100, videos: 0 })).toEqual({ plan: "free", totalRub: 795, topUpRub: 795 }); // 800 кр
  });
  it("picks Pro once the grant pays off", () => {
    expect(bestPlan({ texts: 250, images: 125, videos: 0 })).toEqual({ plan: "pro", totalRub: 990, topUpRub: 0 }); // 1000 кр
  });
  it("picks cheapest combo including top-up", () => {
    // 6 видео = 720 кр + 300 текстов = 600 кр → 1320 кр: Pro 990 + 320 = 1310 < Free 1315 < Ultra 2990
    const r = bestPlan({ texts: 300, images: 0, videos: 6 });
    expect(r).toEqual({ plan: "pro", totalRub: 1310, topUpRub: 320 });
  });
  it("switches to Ultra for heavy usage", () => {
    expect(bestPlan({ texts: 500, images: 500, videos: 20 }).plan).toBe("ultra"); // 1000+2000+2400=5400 кр
  });
});
