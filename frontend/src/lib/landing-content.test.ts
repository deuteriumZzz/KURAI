import { describe, expect, it } from "vitest";
import { LANDING_CAPABILITIES, LANDING_MODES } from "./landing-content";

describe("landing content contract", () => {
  it("does not present deployment-dependent capabilities as ready to use", () => {
    expect(LANDING_CAPABILITIES.every((capability) => capability.available || capability.status === "deployment-dependent")).toBe(true);
    expect(LANDING_CAPABILITIES.filter((capability) => !capability.available)).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: "deployment-dependent" })]),
    );
  });

  it("only exposes ready modes in the interactive product preview", () => {
    expect(LANDING_MODES.every((mode) => mode.available)).toBe(true);
    expect(LANDING_MODES.map((mode) => mode.id)).toEqual(["text", "research", "image", "slides"]);
  });
});
