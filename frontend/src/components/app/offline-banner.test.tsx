import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ kuraiApi: null as unknown }));

vi.mock("@/lib/kurai-api", () => api);

import { LocalPreviewBanner } from "./offline-banner";

describe("LocalPreviewBanner", () => {
  afterEach(() => {
    api.kuraiApi = null;
    cleanup();
  });

  it("identifies an API-free workspace as a local preview", () => {
    render(<LocalPreviewBanner />);

    expect(screen.getByRole("status").textContent).toMatch(/локальный просмотр/i);
    expect(screen.getByRole("status").textContent).toMatch(/сервер аккаунтов не подключён/i);
  });

  it("stays absent when a workspace API is configured", () => {
    api.kuraiApi = {};
    render(<LocalPreviewBanner />);

    expect(screen.queryByRole("status")).toBeNull();
  });
});
