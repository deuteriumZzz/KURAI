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

  it("marks how many citations back each claim, and claims without any", () => {
    const text = "Спрос на кофе навынос в спальных районах растёт третий год подряд [1].\n\nКонкуренты почти не работают по утрам, поэтому окно с семи до девяти свободно.";
    const { container } = render(<Markdown text={text} sources={sources} />);
    const [first, second] = [...container.querySelectorAll(".k-doc > p")];
    expect(first?.getAttribute("data-cover")).toBe("1 источник");
    expect(second?.getAttribute("data-cover")).toBe("без подтверждения");
  });
});
