import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Message } from "@/types/api";
import { Inspector } from "./inspector";

const user: Message = { id: "u", chatId: "c", parentId: null, role: "user", mode: "text", model: null, costMicro: 0, createdAt: "2026-09-23T12:24:00Z", parts: [{ type: "text", text: "Вопрос" }] };
const answer: Message = { id: "a", chatId: "c", parentId: "u", role: "assistant", mode: "research", model: "Claude Sonnet 5", costMicro: 384_000, createdAt: "2026-09-23T12:26:00Z", parts: [{ type: "text", text: "Ответ [1]" }] };

describe("Inspector", () => {
  afterEach(cleanup);

  it("shows only modules backed by real run data", () => {
    render(<Inspector branch={[user]} runs={{}} totalMicro={0} contextChars={6} onJump={vi.fn()} onFollowup={vi.fn()} />);
    expect(screen.queryByRole("region", { name: "Маршрут" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Источники" })).toBeNull();
    expect(screen.getByText(/появятся маршрут, цена и источники/)).toBeTruthy();
  });

  it("numbers sources like the answer citations and exposes the route", () => {
    const runs = { a: { status: "done" as const, log: [], sources: [{ url: "https://example.com/a", title: "Первый источник" }] } };
    render(<Inspector branch={[user, answer]} runs={runs} totalMicro={384_000} contextChars={20} onJump={vi.fn()} onFollowup={vi.fn()} />);
    expect(screen.getByRole("region", { name: "Маршрут" }).textContent).toContain("Claude Sonnet 5");
    const source = screen.getByRole("link", { name: /Первый источник/ });
    expect(source.closest("[data-n]")?.getAttribute("data-n")).toBe("1");
  });
});
