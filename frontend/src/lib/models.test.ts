import { describe, expect, it } from "vitest";
import { defaultModel, modelsForMode, searchModels } from "./models";

describe("models", () => {
  it("filters by mode", () => {
    expect(modelsForMode("video").every((m) => m.group === "video")).toBe(true);
    expect(modelsForMode("text")[0]?.id).toBe("auto");
  });
  it("default respects preference only when it fits the mode", () => {
    expect(defaultModel("text", "gpt-5").id).toBe("gpt-5");
    expect(defaultModel("image", "gpt-5").id).toBe("nano-banana-pro");
    expect(defaultModel("text").id).toBe("auto");
  });
  it("searches name, provider and note case-insensitively", () => {
    const text = modelsForMode("text");
    expect(searchModels(text, "anthropic").map((m) => m.id)).toEqual(["claude-opus-5-5", "claude-sonnet-5"]);
    expect(searchModels(text, "КОД").length).toBeGreaterThan(0);
    expect(searchModels(text, "  ")).toHaveLength(text.length);
  });
});
