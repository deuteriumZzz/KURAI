import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ResetPage from "./page";

describe("ResetPage", () => {
  it("does not claim an email was sent while no reset-delivery endpoint exists", () => {
    render(<ResetPage />);

    expect(screen.getByRole("heading", { name: /восстановление недоступно/i })).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: /email/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /отправить/i })).toBeNull();
  });
});
