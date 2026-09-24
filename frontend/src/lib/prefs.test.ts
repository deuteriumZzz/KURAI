import { describe, expect, it } from "vitest";
import { pushRecent, toggleFavorite } from "./prefs";

describe("prefs helpers", () => {
  it("pushRecent keeps newest first, unique, max 3", () => {
    expect(pushRecent(["a", "b", "c"], "b")).toEqual(["b", "a", "c"]);
    expect(pushRecent(["a", "b", "c"], "d")).toEqual(["d", "a", "b"]);
  });
  it("toggleFavorite adds and removes", () => {
    expect(toggleFavorite([], "x")).toEqual(["x"]);
    expect(toggleFavorite(["x", "y"], "x")).toEqual(["y"]);
  });
});
