import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { readPrefs, writePrefs } from "@/lib/prefs";
import { ModelCatalog } from "./model-catalog";

describe("ModelCatalog", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("puts saved favourites first and lets a member change the saved set", () => {
    writePrefs({ favorites: ["gpt-5"] });
    render(<ModelCatalog filter="text" />);

    expect(screen.getAllByRole("rowheader")[0]?.textContent).toContain("GPT-5");

    fireEvent.click(screen.getByRole("button", { name: /убрать gpt-5 из избранного/i }));
    expect(readPrefs().favorites).toEqual([]);
  });

  it("builds a bounded, readable comparison from selected models", () => {
    render(<ModelCatalog filter="text" />);

    fireEvent.click(screen.getByRole("button", { name: /добавить gpt-5 в сравнение/i }));
    fireEvent.click(screen.getByRole("button", { name: /добавить claude opus 5.5 в сравнение/i }));

    expect(screen.getByRole("region", { name: /сравнение маршрутов/i }).textContent).toContain("GPT-5");
    expect(screen.getByRole("region", { name: /сравнение маршрутов/i }).textContent).toContain("Claude Opus 5.5");
    expect(screen.getByRole("link", { name: /сравнить ответы/i }).getAttribute("href"))
      .toBe("/app?compare=gpt-5%2Cclaude-opus-5-5");
  });

  it("limits an unfinished comparison to three explicit models", () => {
    render(<ModelCatalog filter="text" />);

    fireEvent.click(screen.getByRole("button", { name: /добавить gpt-5 в сравнение/i }));
    fireEvent.click(screen.getByRole("button", { name: /добавить claude opus 5.5 в сравнение/i }));
    fireEvent.click(screen.getByRole("button", { name: /добавить claude sonnet 5 в сравнение/i }));

    const fourthChoice = screen.getByRole("button", { name: /добавить gemini 2.5 pro в сравнение/i });
    expect(fourthChoice.hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("region", { name: /сравнение маршрутов/i }).textContent).not.toContain("Gemini 2.5 Pro");
  });
});
