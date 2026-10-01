import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ kuraiApi: null as null | { updateChat: ReturnType<typeof vi.fn>; createProject: ReturnType<typeof vi.fn> } }));
vi.mock("@/lib/kurai-api", () => api);
vi.mock("next/navigation", () => ({ usePathname: () => "/app" }));

import { Sidebar } from "./sidebar";
import { chatsStore, projectsStore } from "@/lib/app-state";

const chat = { id: "c1", title: "План", updatedAt: "2026-09-23T12:00:00Z", pinned: false, headId: "h" };
const balance = { micro: 1_000_000, plan: "pro" as const, planUntil: null, monthlyGrantMicro: 2_000_000 };
const user = { id: "u", name: "Дмитрий", email: "d@example.test" };

function renderSidebar() {
  return render(
    <Sidebar collapsed={false} onToggle={() => {}} onSearch={() => {}} chats={chatsStore.get()} balance={balance} user={user} now={new Date("2026-09-23T15:00:00Z")} />,
  );
}

describe("Sidebar — действия с чатом в рабочем режиме", () => {
  beforeEach(() => {
    chatsStore.set([chat]);
    projectsStore.set([]);
  });
  afterEach(() => {
    cleanup();
    api.kuraiApi = null;
  });

  it("archives on the server instead of only hiding locally", () => {
    const updateChat = vi.fn().mockResolvedValue({});
    api.kuraiApi = { updateChat, createProject: vi.fn() };
    renderSidebar();

    fireEvent.click(screen.getByRole("button", { name: /Действия с чатом «План»/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Убрать из истории/ }));

    expect(updateChat).toHaveBeenCalledWith("c1", { archived: true });
    expect(chatsStore.get()).toEqual([]);
    expect(screen.getByText("Чат убран из истории")).toBeTruthy();
  });

  it("rolls back and explains when the server refuses", async () => {
    api.kuraiApi = { updateChat: vi.fn().mockRejectedValue(new Error("offline")), createProject: vi.fn() };
    renderSidebar();

    fireEvent.click(screen.getByRole("button", { name: /Действия с чатом «План»/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Закрепить/ }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/Не удалось сохранить/));
    expect(chatsStore.get()[0]?.pinned).toBe(false);
  });
});
