import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Markdown } from "./markdown";

const sources = [{ url: "https://example.com/a", title: "Источник" }];

describe("Markdown — сноски и безопасность", () => {
  afterEach(cleanup);

  it("turns [n] in prose into a source citation but leaves code untouched", () => {
    const { container } = render(<Markdown text={"Утверждение [1].\n\nКод: `arr[0]`\n\n```\nlist[1]\n```"} sources={sources} />);
    expect(screen.getByRole("link", { name: /Источник 1: Источник/ })).toBeTruthy();
    expect(container.textContent).toContain("arr[0]");
    expect(container.textContent).toContain("list[1]");
  });

  it("never loads remote images from model output", () => {
    const { container } = render(<Markdown text={"![график](https://tracker.example/pixel.png)"} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("link", { name: /Изображение: график/ }).getAttribute("href")).toBe("https://tracker.example/pixel.png");
  });
});
