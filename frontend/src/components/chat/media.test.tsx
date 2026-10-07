import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JobCard, VideoCard } from "./media";

const job = (status: "queued" | "running", progress = 0) => ({ type: "job" as const, jobId: "j", kind: "video" as const, status, progress });

describe("JobCard — honest queue and progress", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows the server position when known, otherwise how long the job has waited", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const { rerender } = render(<JobCard job={job("queued")} queuePosition={2} />);
    expect(screen.getByText(/позиция/).textContent).toContain("2");

    rerender(<JobCard job={job("queued")} since={7_000} />);
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByText(/в очереди · 4 с/)).toBeTruthy();

    rerender(<JobCard job={job("running", 0.42)} since={7_000} />);
    expect(screen.getByText(/генерация · 42%/)).toBeTruthy();
  });

  it("reveals the poster frame and duration only when the video is ready", () => {
    render(<VideoCard video={{ type: "video", url: "", poster: "/p.png", durationSec: 8 }} />);
    expect(screen.getByAltText(/Кадр/)).toBeTruthy();
    expect(screen.getByText("8 с")).toBeTruthy();
  });
});
