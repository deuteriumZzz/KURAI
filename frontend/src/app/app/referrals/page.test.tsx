import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ReferralsPage from "./page";

describe("ReferralsPage", () => {
  it("does not invent a referral link, credits, or activation progress before the program exists", () => {
    render(<ReferralsPage />);

    expect(screen.getByRole("heading", { name: /приглашения пока не запущены/i })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /копировать/i })).toBeNull();
    expect(screen.queryByText(/200 кредитов/i)).toBeNull();
  });
});
