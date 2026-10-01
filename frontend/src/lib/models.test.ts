import { describe, expect, it } from "vitest";
import { defaultModel, fromCatalogModel, modelById, modelByName, modelsForMode, searchModels } from "./models";

describe("modelByName", () => {
  it("resolves catalog names and treats «Авто · …» as the auto route", () => {
    expect(modelByName("Claude Sonnet 5")?.id).toBe("claude-sonnet-5");
    expect(modelByName("Авто · агент")?.group).toBe("auto");
    expect(modelByName("Неизвестная модель")).toBeUndefined();
  });
});

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
  it("does not promise a hidden fallback for automatic routing", () => {
    expect(modelById("auto")?.note).not.toMatch(/резерв/i);
  });
  it("searches name, provider and note case-insensitively", () => {
    const text = modelsForMode("text");
    expect(searchModels(text, "anthropic").map((m) => m.id)).toEqual(["claude-opus-5-5", "claude-sonnet-5"]);
    expect(searchModels(text, "КОД").length).toBeGreaterThan(0);
    expect(searchModels(text, "  ")).toHaveLength(text.length);
  });
  it("maps a live server catalog record without inventing a provider model", () => {
    const model = fromCatalogModel({
      id: "openrouter/auto",
      name: "OpenRouter Auto",
      provider: "OpenRouter",
      description: "Маршрутизация по задаче",
      contextLength: 200_000,
      inputModalities: ["text"],
      outputModalities: ["text"],
      supportedModes: ["text", "research", "slides"],
      priceHintMicro: 8_400,
    });

    expect(model).toMatchObject({ id: "openrouter/auto", group: "auto", contextK: 200, priceHintMicro: 8_400 });
    expect(model.note).toBe("Маршрутизация по задаче");
  });
});
