import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrast } from "./contrast";

// Токены читаются прямо из globals.css — тест проверяет настоящую тему, а не её копию.
const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

function theme(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
}

// кабинет наследует корневой @theme и переопределяет его своим материалом
const night = { ...theme("@theme"), ...theme(".kurai-app") };
const paper = { ...night, ...theme(':root[data-theme="light"] .kurai-app') };

describe.each([
  ["Night Ops", night],
  ["Paper System", paper],
])("%s — контраст текста и сигналов (WCAG 2.2 AA)", (_, t) => {
  const surfaces = ["bg", "g1", "g2", "rail"] as const;

  it.each(["ink", "prose", "ink2", "ink3"])("%s читается на всех рабочих поверхностях", (fg) => {
    for (const s of surfaces) expect(contrast(t[fg]!, t[s]!), `${fg} на ${s}`).toBeGreaterThanOrEqual(4.5);
  });

  it("текст на лаймовой кнопке и лайм как текст", () => {
    expect(contrast(t["acc-ink"]!, t.acc!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["acc-text"]!, t.bg!)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["violet", "signal", "warn", "err", "ok"])("сигнал %s читается как текст на фоне", (fg) => {
    expect(contrast(t[fg]!, t.bg!)).toBeGreaterThanOrEqual(4.5);
  });
});

// К11: альтернативные акценты меняют только акцентные токены — кнопка и акцентный текст должны читаться в обеих темах
describe.each([
  ["Night Ops · Night City", { ...night, ...theme(':root[data-accent="yellow"] .kurai-app') }],
  ["Night Ops · циан", { ...night, ...theme(':root[data-accent="cyan"] .kurai-app') }],
  ["Paper · Night City", { ...paper, ...theme(':root[data-theme="light"][data-accent="yellow"] .kurai-app') }],
  ["Paper · циан", { ...paper, ...theme(':root[data-theme="light"][data-accent="cyan"] .kurai-app') }],
])("%s — акцент читается", (_, t) => {
  it("текст на акцентной кнопке и акцент как текст", () => {
    expect(contrast(t["acc-ink"]!, t.acc!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["acc-text"]!, t.bg!)).toBeGreaterThanOrEqual(4.5);
  });
});
