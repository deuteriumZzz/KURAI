import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/app/c/t" }));
vi.mock("@/lib/kurai-api", () => ({ kuraiApi: null }));

import { ChatView } from "./chat-view";
import { handOff } from "@/lib/chat-cache";

const chat = { id: "t", title: "Тест", updatedAt: "2026-09-23T12:00:00Z", pinned: false, headId: "" };

describe("ChatView — send, stream, cancel, recover", () => {
  beforeAll(() => {
    window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
    Element.prototype.scrollIntoView ??= () => {};
  });
  afterEach(cleanup);

  it("streams a routed answer, stops it on request and offers a truthful recovery", { timeout: 15_000 }, async () => {
    render(<ChatView chat={chat} initial={[]} balanceMicro={10_000_000} />);

    fireEvent.change(screen.getByLabelText(/^Запрос/), { target: { value: "Сравни тарифы" } });
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

    expect(screen.getByText("Сравни тарифы")).toBeTruthy();
    const stop = await screen.findByRole("button", { name: "Остановить ответ" });
    expect(screen.getByText("Модель отвечает")).toBeTruthy();

    fireEvent.click(stop);

    await waitFor(() => expect(screen.getByText(/Остановлено · списано/)).toBeTruthy());
    expect(screen.getByRole("button", { name: /Запустить заново/ })).toBeTruthy();
    expect(screen.getByText("Ответ остановлен")).toBeTruthy();
  });

  it("never simulates a server-side generation from history: the job keeps its real state", { timeout: 10_000 }, async () => {
    const at = "2026-09-23T12:00:00Z";
    const initial = [
      { id: "q", chatId: "t", parentId: null, role: "user" as const, mode: "image" as const, model: null, costMicro: 0, createdAt: at, parts: [{ type: "text" as const, text: "Обложка" }] },
      { id: "a", chatId: "t", parentId: "q", role: "assistant" as const, mode: "image" as const, model: "m", costMicro: 0, createdAt: at, parts: [{ type: "job" as const, jobId: "run-1", kind: "image" as const, status: "running" as const, progress: 0.3 }] },
    ];
    render(<ChatView chat={{ ...chat, headId: "a" }} initial={initial} balanceMicro={10_000_000} live />);

    await new Promise((r) => setTimeout(r, 2500));
    expect(screen.getByText(/Изображение · генерация · 30%/)).toBeTruthy();
    expect(screen.queryAllByRole("img", { name: /Открыть/ })).toHaveLength(0);
  });

  it("sends the prompt handed over from home exactly once in a new offline chat", { timeout: 10_000 }, async () => {
    handOff("local-1", { text: "Спланируй запуск кофейни", mode: "text", model: "Авто" });
    render(<ChatView chat={{ ...chat, id: "local-1" }} initial={[]} balanceMicro={10_000_000} />);

    await waitFor(() => expect(screen.getAllByText("Спланируй запуск кофейни")).toHaveLength(1));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getAllByText("Спланируй запуск кофейни")).toHaveLength(1);
  });
});
