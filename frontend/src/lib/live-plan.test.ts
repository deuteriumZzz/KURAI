import { describe, expect, it } from "vitest";
import { followupMode, followupsFor, livePlan } from "./live-plan";

describe("livePlan — steps only from real run events", () => {
  it("walks research through route, sources and writing, counting sources on the search step", () => {
    const states = (phase: Parameters<typeof livePlan>[1], n = 0) => livePlan("research", phase, n)?.map((t) => t.status);
    expect(states("queued")).toEqual(["doing", "todo", "todo"]);
    expect(states("routed")).toEqual(["done", "doing", "todo"]);
    expect(states("writing")).toEqual(["done", "done", "doing"]);
    expect(states("done")).toEqual(["done", "done", "done"]);
    expect(livePlan("research", "routed", 3)?.[1]?.progress).toBe("3 ист.");
  });

  it("has no plan for plain text and media answers", () => {
    expect(livePlan("text", "routed", 0)).toBeNull();
    expect(livePlan("image", "routed", 0)).toBeNull();
  });
});

describe("followups", () => {
  it("offer only modes this server can run, and route each to its own mode", () => {
    const textOnly = (m: string) => m === "text" || m === "slides";
    expect(followupsFor("text", textOnly)).toEqual(["Сделай короче", "Оформи таблицей"]);
    expect(followupMode("Сделай из этого слайды")).toBe("slides");
    expect(followupMode("Какие риски?")).toBe("text");
  });
});

describe("plural", () => {
  it("follows Russian rules including 11–14 and 21", async () => {
    const { plural } = await import("./format");
    const f: [string, string, string] = ["источник", "источника", "источников"];
    expect([1, 3, 5, 12, 21, 22].map((n) => plural(n, f))).toEqual(["1 источник", "3 источника", "5 источников", "12 источников", "21 источник", "22 источника"]);
  });
});
