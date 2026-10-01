import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/app/c/t" }));
vi.mock("@/lib/kurai-api", () => ({ kuraiApi: null }));

import { ChatView } from "./chat-view";

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
});
