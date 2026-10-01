import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  me: vi.fn(),
  serviceStatus: vi.fn(),
}));

vi.mock("@/lib/kurai-api", () => ({ kuraiApi: api }));

import { WorkspaceSignal } from "./workspace-signal";

describe("WorkspaceSignal", () => {
  it("shows only server-reported readiness without a decorative greeting", async () => {
    api.me.mockResolvedValue({ id: "member-1", email: "maya@example.test", displayName: "Майя" });
    api.serviceStatus.mockResolvedValue({ status: "ok", modelsOnline: 7, capabilities: [], reasons: [] });

    render(<WorkspaceSignal />);

    await screen.findByRole("status");
    expect(screen.getByRole("status").textContent).toContain("7 моделей доступны");
    expect(screen.getByRole("status").textContent).toContain("система готова");
    expect(screen.queryByText(/Майя/)).toBeNull();
  });
});
