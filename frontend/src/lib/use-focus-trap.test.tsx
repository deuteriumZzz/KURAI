import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFocusTrap } from "./use-focus-trap";

function TestDialog() {
  const ref = createRef<HTMLDivElement>();
  useFocusTrap(true, ref);
  return (
    <div ref={ref} role="dialog">
      <button type="button">Первое</button>
      <button type="button">Второе</button>
    </div>
  );
}

describe("useFocusTrap", () => {
  it("keeps Tab navigation inside an active modal surface", () => {
    render(<TestDialog />);
    const first = screen.getByRole("button", { name: "Первое" });
    const last = screen.getByRole("button", { name: "Второе" });

    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
