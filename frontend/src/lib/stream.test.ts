import { describe, expect, it } from "vitest";
import type { Message } from "@/types/api";
import { applyEvent, newRun, type StreamEvent } from "./stream";

const base: Message = {
  id: "a", chatId: "c", parentId: "u", role: "assistant", mode: "text", model: null, parts: [], costMicro: 0,
  createdAt: "2026-09-23T00:00:00Z",
};

function run(events: StreamEvent[], msg: Message = base) {
  return events.reduce((s, ev) => applyEvent(s.msg, s.run, ev), { msg, run: newRun() });
}

describe("applyEvent", () => {
  it("routes, falls back and streams text into one part", () => {
    const s = run([
      { type: "route", model: "Claude Sonnet 5", node: "EU-01", latencyMs: 240 },
      { type: "fallback", from: "Claude Sonnet 5", to: "GPT-5", reason: "нет ответа за 8 с" },
      { type: "delta", text: "При" },
      { type: "delta", text: "вет" },
    ]);
    expect(s.msg.model).toBe("GPT-5");
    expect(s.msg.parts).toEqual([{ type: "text", text: "Привет" }]);
    expect(s.run.log.map((l) => l.tone)).toEqual(["default", "warn"]);
    expect(s.run.status).toBe("streaming");
  });

  it("finishes with integer cost and duration", () => {
    const s = run([{ type: "delta", text: "ok" }, { type: "done", costMicro: 78_000, durationMs: 6200 }]);
    expect(s.run.status).toBe("done");
    expect(s.msg.costMicro).toBe(78_000);
    expect(s.run.durationMs).toBe(6200);
  });

  it("error refunds: cost becomes zero", () => {
    const s = run([{ type: "error", message: "провайдер недоступен", refundedMicro: 20_000 }], { ...base, costMicro: 20_000 });
    expect(s.msg.costMicro).toBe(0);
    expect(s.run.status).toBe("error");
  });

  it("aborted keeps partial text and partial cost", () => {
    const s = run([{ type: "delta", text: "полови" }, { type: "aborted", costMicro: 6_000 }]);
    expect(s.msg.parts).toEqual([{ type: "text", text: "полови" }]);
    expect(s.msg.costMicro).toBe(6_000);
    expect(s.run.status).toBe("aborted");
  });

  it("job progress updates the job part, media replaces it", () => {
    const withJob: Message = { ...base, mode: "image", parts: [{ type: "job", jobId: "j", kind: "image", status: "queued", progress: 0 }] };
    const s = run(
      [
        { type: "job", status: "running", progress: 0.5, queuePosition: 1 },
        { type: "media", parts: [{ type: "image", url: "data:,", alt: "x", width: 1, height: 1 }] },
      ],
      withJob,
    );
    expect(s.msg.parts.map((p) => p.type)).toEqual(["image"]);
    expect(s.run.queuePosition).toBe(1);
  });

  it("agent: ask → answered → tasks → sources → artifact", () => {
    const s = run([
      { type: "ask", question: "Какой формат?", options: ["Кратко", "Подробно"] },
      { type: "answered", choice: 1 },
      { type: "tasks", tasks: [{ title: "Найти источники", status: "doing" }] },
      { type: "source", url: "https://habr.com", title: "Хабр" },
      { type: "source", url: "https://vc.ru", title: "vc.ru" },
      { type: "artifact", artifact: { kind: "slides", title: "Итоги", slides: [{ title: "Титул", bullets: [] }] } },
    ]);
    expect(s.run.ask).toEqual({ question: "Какой формат?", options: ["Кратко", "Подробно"], choice: 1 });
    expect(s.run.tasks?.[0]?.status).toBe("doing");
    expect(s.run.sources?.map((x) => x.title)).toEqual(["Хабр", "vc.ru"]);
    expect(s.run.artifact?.slides).toHaveLength(1);
  });

  it("scan collects what the model saw in attachments", () => {
    const s = run([{ type: "scan", name: "a.pdf", labels: ["ТЕКСТ · 18 СТР.", "ТАБЛИЦА"] }]);
    expect(s.run.scans).toEqual([{ name: "a.pdf", labels: ["ТЕКСТ · 18 СТР.", "ТАБЛИЦА"] }]);
  });

  it("thinking accumulates, followups replace", () => {
    const s = run([
      { type: "thinking", text: "Шаг 1. " },
      { type: "thinking", text: "Шаг 2." },
      { type: "followups", items: ["Короче", "Таблицей"] },
    ]);
    expect(s.run.thinking).toBe("Шаг 1. Шаг 2.");
    expect(s.run.followups).toEqual(["Короче", "Таблицей"]);
  });
});
