import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PREFS, pushRecent, readPrefs, toggleFavorite, writePrefs } from "./prefs";

describe("theme preference", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("follows the system on first use", () => {
    expect(DEFAULT_PREFS.theme).toBe("system");
    expect(readPrefs().theme).toBe("system");
  });

  it("persists an explicit choice and changes the material in place", () => {
    document.documentElement.dataset.theme = "dark";
    writePrefs({ theme: "light" });
    expect(JSON.parse(localStorage.getItem("kurai:prefs") ?? "{}").theme).toBe("light");
    expect(readPrefs().theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.classList.contains("k-theme-shift")).toBe(true);
  });
});

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
