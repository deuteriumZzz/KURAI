import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TelegramLogin } from "./telegram-login";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("TelegramLogin", () => {
  it("renders nothing until a Telegram bot is configured — no «not connected» placeholder", () => {
    const { container } = render(<TelegramLogin />);

    expect(container.textContent).toBe("");
  });
});
