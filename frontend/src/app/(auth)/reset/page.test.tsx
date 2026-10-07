import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResetFlow } from "@/components/auth/mail-flows";

describe("ResetPage", () => {
  it("does not claim an email was sent when no account server is connected", () => {
    render(<ResetFlow />);

    expect(screen.getByRole("heading", { name: /восстановление недоступно/i })).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: /email/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /отправить/i })).toBeNull();
  });
});
