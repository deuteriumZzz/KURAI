import type { JobStatus, Message, MessagePart, Micro, Source } from "@/types/api";

/** События потока ответа — форма будущего SSE от бэкенда. */
export type StreamEvent =
  | { type: "route"; model: string; node: string; latencyMs: number }
  | { type: "fallback"; from: string; to: string; reason: string }
  | { type: "delta"; text: string }
  | { type: "job"; status: JobStatus; progress: number; queuePosition?: number; tip?: string }
  | { type: "media"; parts: MessagePart[] }
  | { type: "scan"; name: string; labels: string[] }
  | { type: "thinking"; text: string }
  | { type: "action"; text: string }
  | { type: "followups"; items: string[] }
  | { type: "ask"; question: string; options: string[] }
  | { type: "answered"; choice: number }
  | { type: "tasks"; tasks: AgentTask[] }
  | { type: "source"; url: string; title: string; quote?: string; readAt?: string }
  | { type: "artifact"; artifact: Artifact }
  | { type: "done"; costMicro: Micro; durationMs: number }
  | { type: "error"; message: string; refundedMicro: Micro }
  | { type: "aborted"; costMicro: Micro };

export type LogTone = "default" | "acc" | "warn" | "err" | "ok";

export type AgentTask = { title: string; status: "todo" | "doing" | "done"; progress?: string };
export type Slide = { title: string; bullets: string[] };
export type Artifact = { kind: "slides"; title: string; slides: Slide[] };

/** Клиентское состояние выполнения ответа (не хранится в договоре сообщения). */
export type RunState = {
  status: "streaming" | "done" | "error" | "aborted";
  log: { tone: LogTone; text: string }[];
  durationMs?: number;
  /** Хронометраж из событий этого запуска (мс от эпохи): старт, первая мысль, первое слово, конец. */
  startedAt?: number;
  /** Что человек выбрал до запуска (например, «auto») — чтобы честно объяснить итоговый маршрут. */
  requested?: string;
  thinkingAt?: number;
  firstTokenAt?: number;
  doneAt?: number;
  queuePosition?: number;
  tip?: string;
  /** Агент ждёт уточнения — выбор реплики. */
  ask?: { question: string; options: string[]; choice?: number };
  tasks?: AgentTask[];
  sources?: Source[];
  /** Сервер выбрал маршрут (конец очереди) и пришёл первый источник — слои хронометража. */
  routedAt?: number;
  searchAt?: number;
  artifact?: Artifact;
  /** Что модель «увидела» во вложениях — для сканера. */
  scans?: { name: string; labels: string[] }[];
  /** Поток рассуждений («Думать дольше»). */
  thinking?: string;
  /** Сколько вернул сервер после ошибки — показываем только реальную сумму. */
  refundedMicro?: number;
  /** Продолжения под готовым ответом. */
  followups?: string[];
  /** Лента действий агента («живое рабочее место»). */
  actions?: string[];
};

export const newRun = (at: number = Date.now()): RunState => ({ status: "streaming", log: [], startedAt: at });

function appendText(parts: MessagePart[], text: string): MessagePart[] {
  const last = parts[parts.length - 1];
  if (last?.type === "text") return [...parts.slice(0, -1), { type: "text", text: last.text + text }];
  return [...parts, { type: "text", text }];
}

/** Чистая функция: применяет событие к сообщению и состоянию выполнения; `now` — момент события. */
export function applyEvent(msg: Message, run: RunState, ev: StreamEvent, now: number = Date.now()): { msg: Message; run: RunState } {
  switch (ev.type) {
    case "route":
      return { msg: { ...msg, model: ev.model }, run: { ...run, routedAt: run.routedAt ?? now, log: [...run.log, { tone: "default", text: `${ev.model}${ev.node ? ` · ${ev.node}` : ""}${ev.latencyMs ? ` · ${ev.latencyMs} мс` : ""}` }] } };
    case "fallback":
      return {
        msg: { ...msg, model: ev.to },
        run: { ...run, log: [...run.log, { tone: "warn", text: `${ev.reason} → переключаюсь на ${ev.to}` }] },
      };
    case "delta":
      return { msg: { ...msg, parts: appendText(msg.parts, ev.text) }, run: run.firstTokenAt ? run : { ...run, firstTokenAt: now } };
    case "job": {
      const parts = msg.parts.map((p) => (p.type === "job" ? { ...p, status: ev.status, progress: ev.progress } : p));
      return { msg: { ...msg, parts }, run: { ...run, queuePosition: ev.queuePosition, tip: ev.tip ?? run.tip } };
    }
    case "media":
      return { msg: { ...msg, parts: [...msg.parts.filter((p) => p.type !== "job"), ...ev.parts] }, run };
    case "action":
      return { msg, run: { ...run, actions: [...(run.actions ?? []), ev.text] } };
    case "thinking":
      return { msg, run: { ...run, thinking: (run.thinking ?? "") + ev.text, thinkingAt: run.thinkingAt ?? now } };
    case "followups":
      return { msg, run: { ...run, followups: ev.items } };
    case "scan":
      return { msg, run: { ...run, scans: [...(run.scans ?? []), { name: ev.name, labels: ev.labels }] } };
    case "ask":
      return { msg, run: { ...run, ask: { question: ev.question, options: ev.options } } };
    case "answered":
      return { msg, run: { ...run, ask: run.ask ? { ...run.ask, choice: ev.choice } : undefined } };
    case "tasks":
      return { msg, run: { ...run, tasks: ev.tasks } };
    case "source":
      return { msg, run: { ...run, searchAt: run.searchAt ?? now, sources: [...(run.sources ?? []), { url: ev.url, title: ev.title, ...(ev.quote ? { quote: ev.quote } : {}), ...(ev.readAt ? { readAt: ev.readAt } : {}) }] } };
    case "artifact":
      return { msg, run: { ...run, artifact: ev.artifact } };
    case "done":
      // живой сервер не присылает длительность — берём её из собственных отметок запуска
      return {
        msg: { ...msg, costMicro: ev.costMicro },
        run: { ...run, status: "done", durationMs: ev.durationMs || (run.startedAt ? now - run.startedAt : 0), doneAt: now, queuePosition: undefined, tip: undefined },
      };
    case "error":
      return {
        msg: { ...msg, costMicro: 0 },
        // текст ошибки показывает карточка «Повторить» в сообщении
        run: { ...run, status: "error", refundedMicro: ev.refundedMicro },
      };
    case "aborted":
      return { msg: { ...msg, costMicro: ev.costMicro }, run: { ...run, status: "aborted" } };
  }
}
