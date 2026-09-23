import { describe, expect, it } from "vitest";
import { modeById, modeForFollowup, parseCommand } from "./modes";

describe("parseCommand", () => {
  it("switches mode by leading command and keeps the rest", () => {
    expect(parseCommand("/v снег в горах")).toEqual({ mode: "video", rest: "снег в горах" });
    expect(parseCommand("/i")).toEqual({ mode: "image", rest: "" });
  });
  it("ignores unknown commands and non-leading slashes", () => {
    expect(parseCommand("/x hi")).toBeNull();
    expect(parseCommand("сделай /v")).toBeNull();
    expect(parseCommand("/video")).toBeNull();
  });
});

describe("modeById", () => {
  it("returns config for a mode", () => {
    expect(modeById("image").model).toBe("Nano Banana Pro");
  });
});

describe("modeForFollowup", () => {
  it("maps follow-up text to the right mode", () => {
    expect(modeForFollowup("Нарисуй картинку к этому", "text")).toBe("image");
    expect(modeForFollowup("Оживи первую в видео", "image")).toBe("video");
    expect(modeForFollowup("Сделай из этого слайды", "research")).toBe("slides");
    expect(modeForFollowup("Добавь озвучку", "video")).toBe("audio");
    expect(modeForFollowup("Сделай короче", "text")).toBe("text");
    expect(modeForFollowup("Другой голос", "audio")).toBe("audio");
  });
});
