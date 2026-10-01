import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TelegramLogin } from "./telegram-login";

describe("TelegramLogin", () => {
  it("does not present an unconnected QR code as a functioning authentication method", () => {
    render(<TelegramLogin />);

    expect(screen.getByText(/вход через Telegram пока не подключён/i)).toBeTruthy();
    expect(screen.queryByRole("img", { name: /QR-код/i })).toBeNull();
  });
});
