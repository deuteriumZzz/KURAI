import { describe, expect, it } from "vitest";
import { modeById, parseCommand } from "./modes";

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
