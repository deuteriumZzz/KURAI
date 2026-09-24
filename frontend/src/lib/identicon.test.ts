import { describe, expect, it } from "vitest";
import { identicon } from "./identicon";

describe("identicon", () => {
  it("is deterministic, 25 cells, mirrored", () => {
    const a = identicon("dmitry@kurai.ai");
    expect(a).toEqual(identicon("dmitry@kurai.ai"));
    expect(a).toHaveLength(25);
    for (let y = 0; y < 5; y++) {
      expect(a[y * 5]).toBe(a[y * 5 + 4]);
      expect(a[y * 5 + 1]).toBe(a[y * 5 + 3]);
    }
  });
  it("differs for different seeds", () => {
    expect(identicon("a@b.ru")).not.toEqual(identicon("c@d.ru"));
  });
});
