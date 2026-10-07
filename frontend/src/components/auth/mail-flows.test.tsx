import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  serviceStatus: vi.fn(async () => ({ status: "ok", modelsOnline: 1, capabilities: [], reasons: [] as string[] })),
  requestPasswordReset: vi.fn(async () => undefined),
  confirmPasswordReset: vi.fn(async () => undefined),
  verifyEmail: vi.fn(async () => undefined),
  resendVerification: vi.fn(async () => undefined),
}));
vi.mock("@/lib/kurai-api", async (original) => ({ ...(await original<typeof import("@/lib/kurai-api")>()), kuraiApi: api }));

import { KuraiApiError } from "@/lib/kurai-api";
import { ResetFlow, VerifyFlow } from "./mail-flows";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("password reset", () => {
  it("requests a letter and answers the same way for any address", async () => {
    render(<ResetFlow />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "me@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Отправить ссылку" }));

    expect(await screen.findByRole("heading", { name: "Проверьте почту" })).toBeTruthy();
    expect(api.requestPasswordReset).toHaveBeenCalledWith("me@example.test");
  });

  it("is honestly unavailable when the server has no mail", async () => {
    api.serviceStatus.mockResolvedValueOnce({ status: "degraded", modelsOnline: 1, capabilities: [], reasons: ["mail_unconfigured"] });
    render(<ResetFlow />);
    expect(await screen.findByRole("heading", { name: /восстановление недоступно/i })).toBeTruthy();
  });

  it("sets a new password from the link, and explains an expired link", async () => {
    const { unmount } = render(<ResetFlow uid="u" token="t" />);
    fireEvent.change(screen.getByLabelText("Новый пароль"), { target: { value: "another-safe-password-42" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить пароль" }));
    expect(await screen.findByRole("heading", { name: "Пароль изменён" })).toBeTruthy();
    unmount();

    api.confirmPasswordReset.mockRejectedValueOnce(new KuraiApiError(400, "reset_link_invalid", "Ссылка устарела или уже использована. Запросите новую."));
    render(<ResetFlow uid="u" token="old" />);
    fireEvent.change(screen.getByLabelText("Новый пароль"), { target: { value: "another-safe-password-42" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить пароль" }));
    expect(await screen.findByRole("link", { name: "Запросить новую ссылку" })).toBeTruthy();
  });
});

describe("email confirmation", () => {
  it("confirms by the link and offers a resend when it expired", async () => {
    const { unmount } = render(<VerifyFlow token="ok" />);
    expect(await screen.findByRole("heading", { name: "Адрес подтверждён" })).toBeTruthy();
    unmount();

    api.verifyEmail.mockRejectedValueOnce(new KuraiApiError(400, "verify_link_invalid", "Ссылка устарела."));
    render(<VerifyFlow token="old" />);
    fireEvent.click(await screen.findByRole("button", { name: "Отправить письмо ещё раз" }));
    expect(await screen.findByText(/Письмо отправлено/)).toBeTruthy();
  });
});
