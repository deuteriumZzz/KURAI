import { describe, expect, it } from "vitest";
import { bestPlan, estimateMicro, PLANS, planPrice } from "./pricing";

describe("estimateMicro", () => {
  it("sums units in integer micro", () => {
    expect(estimateMicro({ texts: 100, images: 50, videos: 2 })).toBe(100 * 20_000 + 50 * 40_000 + 2 * 1_200_000);
  });
});

describe("planPrice", () => {
  it("applies 15% annual discount rounding down to a whole credit", () => {
    expect(planPrice(9_900_000, false)).toBe(9_900_000);
    expect(planPrice(9_900_000, true)).toBe(8_410_000);
    expect(planPrice(0, true)).toBe(0);
  });
});

describe("plan prices", () => {
  it("never sell credits above their face value: the markup lives in micro, not in a second price layer", () => {
    for (const p of PLANS) expect(p.priceMicro).toBeLessThanOrEqual(p.grantMicro);
  });
});

describe("bestPlan", () => {
  it("stays on Free for tiny usage", () => {
    expect(bestPlan({ texts: 2, images: 0, videos: 0 })).toEqual({ plan: "free", totalMicro: 0, topUpMicro: 0 });
  });
  it("Free + top-up is cheaper than Pro below ~995 credits", () => {
    expect(bestPlan({ texts: 200, images: 100, videos: 0 })).toEqual({ plan: "free", totalMicro: 7_950_000, topUpMicro: 7_950_000 }); // 800 кр
  });
  it("picks Pro once the grant pays off", () => {
    expect(bestPlan({ texts: 250, images: 125, videos: 0 })).toEqual({ plan: "pro", totalMicro: 9_900_000, topUpMicro: 0 }); // 1000 кр
  });
  it("picks cheapest combo including top-up", () => {
    // 6 видео = 720 кр + 300 текстов = 600 кр → 1320 кр: Pro $9,90 + 320 кр ($3,20) < Free $13,15 < Ultra $29,90
    const r = bestPlan({ texts: 300, images: 0, videos: 6 });
    expect(r).toEqual({ plan: "pro", totalMicro: 13_100_000, topUpMicro: 3_200_000 });
  });
  it("switches to Ultra for heavy usage", () => {
    expect(bestPlan({ texts: 500, images: 500, videos: 20 }).plan).toBe("ultra"); // 1000+2000+2400=5400 кр
  });
});
