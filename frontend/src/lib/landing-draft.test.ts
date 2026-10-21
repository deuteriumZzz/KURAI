import { beforeEach, describe, expect, it } from "vitest";
import { afterAuthHref, saveLandingDraft } from "./landing-draft";

describe("черновик с лендинга", () => {
  beforeEach(() => sessionStorage.clear());

  it("после входа открывает кабинет с черновиком и режимом — один раз", () => {
    saveLandingDraft("research", "Рынок кофе & чая");
    expect(afterAuthHref()).toBe(`/app?mode=research&prompt=${encodeURIComponent("Рынок кофе & чая")}`);
    expect(afterAuthHref()).toBe("/app");
  });

  it("без черновика или с пустым — просто кабинет", () => {
    expect(afterAuthHref()).toBe("/app");
    saveLandingDraft("text", "   ");
    expect(afterAuthHref()).toBe("/app");
  });
});
