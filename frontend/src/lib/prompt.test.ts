import { describe, expect, it } from "vitest";
import { apiOptions, costFactor, defaultParams, enhancePrompt } from "./prompt";

describe("params", () => {
  it("defaults are first options", () => {
    expect(defaultParams("image")).toEqual({ aspect: "1:1", count: "4", style: "Без стиля" });
    expect(defaultParams("text")).toEqual({});
  });
  it("cost scales with image count and video duration", () => {
    expect(costFactor("image", { count: "1" })).toBe(0.25);
    expect(costFactor("video", { duration: "5 с" })).toBe(0.625);
    expect(costFactor("text", {})).toBe(1);
  });
});

describe("enhancePrompt", () => {
  it("adds mode details and style, keeps the original first", () => {
    const out = enhancePrompt("кот в неоне", "image", { style: "Кино", aspect: "4:5" });
    expect(out.startsWith("кот в неоне, ")).toBe(true);
    expect(out).toContain("стиль: кино");
    expect(out).toContain("формат 4:5");
  });
  it("is idempotent and ignores empty input", () => {
    const once = enhancePrompt("письмо клиенту", "text");
    expect(enhancePrompt(once, "text")).toBe(once);
    expect(enhancePrompt("   ", "text")).toBe("");
  });
});

describe("apiOptions", () => {
  it("maps interface labels to the server's canonical run options", () => {
    expect(apiOptions("text", { web: true, think: false, params: {} })).toEqual({ web: true, think: false });
    expect(apiOptions("image", { web: true, think: false, params: { aspect: "4:5", count: "4", style: "Кино" } })).toEqual({ count: 4, aspect: "4:5", style: "cinema" });
    expect(apiOptions("video", { web: false, think: false, params: { duration: "10 с", aspect: "9:16", camera: "Облёт" } })).toEqual({ duration: 10, aspect: "9:16", camera: "orbit" });
    expect(apiOptions("research", { web: true, think: true, params: { depth: "Глубоко" } })).toEqual({ think: true, depth: "deep" });
    expect(apiOptions("audio", { web: true, think: false, params: { speed: "1.2×" } })).toEqual({});
  });
});
