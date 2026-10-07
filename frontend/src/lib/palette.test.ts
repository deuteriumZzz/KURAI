import { describe, expect, it } from "vitest";
import { dominantColors } from "./palette";

const px = (...colors: [number, number, number, number, number][]) =>
  new Uint8ClampedArray(colors.flatMap(([r, g, b, a, times]) => Array.from({ length: times }, () => [r, g, b, a]).flat()));

describe("dominantColors", () => {
  it("orders by area, merges near shades and skips transparent pixels", () => {
    const image = px([20, 20, 20, 255, 60], [24, 22, 21, 255, 10], [216, 236, 152, 255, 25], [255, 0, 0, 0, 100]);
    expect(dominantColors(image, 5)).toEqual(["#151414", "#d8ec98"]);
  });
});
