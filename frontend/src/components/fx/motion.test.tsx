import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Appear } from "./motion";

describe("Appear", () => {
  afterEach(() => {
    document.documentElement.classList.remove("calm");
  });

  it("keeps its content available when calm mode disables motion", () => {
    document.documentElement.classList.add("calm");

    render(<Appear>Модель готова</Appear>);

    expect(screen.getByText("Модель готова")).toBeTruthy();
  });
});
