import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RunReceipt, WorkPlan } from "./agent";

describe("chat work surfaces", () => {
  it("shows a transparent receipt for an ordinary completed answer", () => {
    render(<RunReceipt run={{ status: "done", log: [], durationMs: 2300 }} costMicro={78_000} model="Claude Sonnet 5" />);

    expect(screen.getByText("Claude Sonnet 5")).toBeTruthy();
    expect(screen.getByText("2 с")).toBeTruthy();
    expect(screen.getByText("7,8 кр")).toBeTruthy();
    expect(screen.getByRole("link", { name: "История списаний" }).getAttribute("href")).toBe("/app/billing");
  });

  it("offers stop only while the plan is live", () => {
    const tasks = [{ title: "Собираю источники", status: "doing" as const }];
    const { rerender } = render(<WorkPlan tasks={tasks} live onStop={() => {}} />);
    expect(screen.getByRole("button", { name: /Остановить/ })).toBeTruthy();
    rerender(<WorkPlan tasks={tasks} live={false} onStop={() => {}} />);
    expect(screen.queryByRole("button", { name: /Остановить/ })).toBeNull();
    cleanup();
  });

  it("describes agent work as a plain work plan", () => {
    render(
      <WorkPlan
        tasks={[
          { title: "Собираю источники", status: "done" },
          { title: "Сверяю выводы", status: "doing" },
        ]}
      />,
    );

    expect(screen.getByText("План работы")).toBeTruthy();
    expect(screen.getByText("1 из 2")).toBeTruthy();
    expect(screen.getByText("Сверяю выводы").closest("li")?.getAttribute("aria-current")).toBe("step");
    expect(screen.queryByText(/quest/i)).toBeNull();
  });
});
