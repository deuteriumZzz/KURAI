import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatRow } from "./chat-row";

const chat = {
  id: "signal-04",
  title: "Сравнить маршруты моделей",
  updatedAt: "2026-09-28T10:15:00Z",
  pinned: false,
  headId: "message-04",
  preview: "Нужны стоимость, задержка и объяснение выбора.",
};

describe("ChatRow", () => {
  it("marks the active route and keeps its actions reachable without hover", () => {
    render(
      <ChatRow
        chat={chat}
        active
        now={new Date("2026-09-28T18:00:00Z")}
        onPin={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const link = screen.getByRole("link", { name: /Сравнить маршруты моделей/ });
    expect(link.getAttribute("aria-current")).toBe("page");
    expect(link.textContent).toContain("Сегодня, 10:15");

    const actions = screen.getByRole("button", { name: /действия с чатом/i });
    fireEvent.click(actions);
    expect(actions.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("menuitem", { name: /Переименовать/ })).toBeTruthy();
  });
});
