import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { modelsForMode } from "@/lib/models";
import { ModelPicker } from "./model-picker";

describe("ModelPicker", () => {
  afterEach(cleanup);

  it("opens the available models when the trigger is activated", () => {
    const onChange = vi.fn();
    const models = modelsForMode("text");

    render(<ModelPicker mode="text" value={models[0]!} catalog={models} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /Модель: Авто/i }));

    expect(screen.getByRole("listbox", { name: "Модели" })).toBeTruthy();
    expect(screen.getByRole("option", { name: /GPT-5/i })).toBeTruthy();
    expect(screen.getByRole("option", { name: /Авто/i }).getAttribute("aria-selected")).toBe("true");
  });

  it("selects by keyboard and returns focus to the trigger on Escape", async () => {
    const onChange = vi.fn();
    const models = modelsForMode("text");
    render(<ModelPicker mode="text" value={models[0]!} catalog={models} onChange={onChange} />);
    const trigger = screen.getByRole("button", { name: /Модель: Авто/i });

    fireEvent.click(trigger);
    const search = screen.getByRole("combobox", { name: "Найти модель" });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(models[1]);

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Найти модель" }), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
