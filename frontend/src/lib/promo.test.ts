import { describe, expect, it } from "vitest";
import { redeem } from "./promo";

describe("redeem", () => {
  it("accepts known codes case-insensitively", () => {
    expect(redeem(" kurai20 ")).toEqual({ ok: true, bonusMicro: 2_000_000 });
  });
  it("rejects empty and unknown", () => {
    expect(redeem("")).toMatchObject({ ok: false });
    expect(redeem("FREE1000")).toMatchObject({ ok: false });
  });
});
