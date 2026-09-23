import type { JobStatus, Message, MessagePart, Micro } from "@/types/api";

/** События потока ответа — форма будущего SSE от бэкенда. */
export type StreamEvent =
  | { type: "route"; model: string; node: string; latencyMs: number }
  | { type: "fallback"; from: string; to: string; reason: string }
  | { type: "delta"; text: string }
  | { type: "job"; status: JobStatus; progress: number; queuePosition?: number; tip?: string }
  | { type: "media"; parts: MessagePart[] }
  | { type: "done"; costMicro: Micro; durationMs: number }
  | { type: "error"; message: string; refundedMicro: Micro }
  | { type: "aborted"; costMicro: Micro };

export type LogTone = "default" | "acc" | "warn" | "err" | "ok";

/** Клиентское состояние выполнения ответа (не хранится в договоре сообщения). */
export type RunState = {
  status: "streaming" | "done" | "error" | "aborted";
  log: { tone: LogTone; text: string }[];
  durationMs?: number;
  queuePosition?: number;
  tip?: string;
};

export const newRun = (): RunState => ({ status: "streaming", log: [] });

function appendText(parts: MessagePart[], text: string): MessagePart[] {
  const last = parts[parts.length - 1];
  if (last?.type === "text") return [...parts.slice(0, -1), { type: "text", text: last.text + text }];
  return [...parts, { type: "text", text }];
}

/** Чистая функция: применяет событие к сообщению и состоянию выполнения. */
export function applyEvent(msg: Message, run: RunState, ev: StreamEvent): { msg: Message; run: RunState } {
  switch (ev.type) {
    case "route":
      return { msg: { ...msg, model: ev.model }, run: { ...run, log: [...run.log, { tone: "default", text: `${ev.model} · ${ev.node} · ${ev.latencyMs} мс` }] } };
    case "fallback":
      return {
        msg: { ...msg, model: ev.to },
        run: { ...run, log: [...run.log, { tone: "warn", text: `${ev.reason} → переключаюсь на ${ev.to}` }] },
      };
    case "delta":
      return { msg: { ...msg, parts: appendText(msg.parts, ev.text) }, run };
    case "job": {
      const parts = msg.parts.map((p) => (p.type === "job" ? { ...p, status: ev.status, progress: ev.progress } : p));
      return { msg: { ...msg, parts }, run: { ...run, queuePosition: ev.queuePosition, tip: ev.tip ?? run.tip } };
    }
    case "media":
      return { msg: { ...msg, parts: [...msg.parts.filter((p) => p.type !== "job"), ...ev.parts] }, run };
    case "done":
      return { msg: { ...msg, costMicro: ev.costMicro }, run: { ...run, status: "done", durationMs: ev.durationMs, queuePosition: undefined, tip: undefined } };
    case "error":
      return {
        msg: { ...msg, costMicro: 0 },
        run: { ...run, status: "error", log: [...run.log, { tone: "err", text: `${ev.message} · кредиты за запрос возвращены` }] },
      };
    case "aborted":
      return { msg: { ...msg, costMicro: ev.costMicro }, run: { ...run, status: "aborted" } };
  }
}
