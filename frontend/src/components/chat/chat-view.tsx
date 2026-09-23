"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ChatSummary, Message, Mode } from "@/types/api";
import { applyEvent, newRun, type RunState, type StreamEvent } from "@/lib/stream";
import { branchOf, leafOf, siblingsOf } from "@/lib/tree";
import { modeForFollowup } from "@/lib/modes";
import { formatCredits } from "@/lib/format";
import { partialCost, simulate, type SimOptions } from "@/mocks/stream";
import type { Outgoing } from "@/components/app/composer";
import type { FileMeta } from "@/lib/files";
import { Composer } from "@/components/app/composer";
import { Decode } from "@/components/fx/decode";
import { Label } from "@/components/fx/primitives";
import { AssistantMessage, UserMessage } from "./message";
import { IncomingToast } from "./toast";
import { SidePanel } from "./side-panel";
import { AnimatePresence } from "motion/react";
import { notify } from "@/lib/app-state";
import { Appear } from "@/components/fx/motion";
import type { Artifact } from "@/lib/stream";

type State = { messages: Message[]; runs: Record<string, RunState>; head: string };

const textOf = (m: Message | undefined) => m?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ?? "";
const isJobMode = (mode: Mode) => mode === "image" || mode === "video";
let seq = 0;
const newId = (p: string) => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Единый чат: одна лента для текста, изображений и видео; ветки ответов; стриминг с расшифровкой. */
export function ChatView({ chat, initial, balanceMicro }: { chat: ChatSummary; initial: Message[]; balanceMicro: number }) {
  const [state, setState] = useState<State>({ messages: initial, runs: {}, head: chat.headId });
  const [toast, setToast] = useState<{ title: string; id: string } | null>(null);
  const controllers = useRef(new Map<string, AbortController>());
  const askers = useRef(new Map<string, (choice: number) => void>());
  const [panel, setPanel] = useState<Artifact | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [compressed, setCompressed] = useState(false);
  const lastOpts = useRef<SimOptions>({});
  const [initialIds] = useState(() => new Set(initial.map((m) => m.id)));
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const branch = branchOf(state.head, state.messages);
  const textStreaming = branch.find((m) => state.runs[m.id]?.status === "streaming" && !isJobMode(m.mode));
  const total = branch.reduce((s, m) => s + m.costMicro, 0);

  const apply = useCallback((id: string, ev: StreamEvent) => {
    setState((s) => {
      const msg = s.messages.find((m) => m.id === id);
      if (!msg) return s;
      const res = applyEvent(msg, s.runs[id] ?? newRun(), ev);
      return { ...s, messages: s.messages.map((m) => (m.id === id ? res.msg : m)), runs: { ...s.runs, [id]: res.run } };
    });
  }, []);

  const run = useCallback(
    async (id: string, prompt: string, mode: Mode, fromProgress = 0, opts: SimOptions = {}) => {
      const ctrl = new AbortController();
      controllers.current.set(id, ctrl);
      let chars = 0;
      try {
        const ask = () => new Promise<number>((resolve) => askers.current.set(id, resolve));
        for await (const ev of simulate(prompt, mode, ctrl.signal, fromProgress, ask, opts)) {
          if (ev.type === "delta") chars += ev.text.length;
          apply(id, ev);
          if (ev.type === "artifact") setPanel(ev.artifact);
          if (ev.type === "done" && mode === "video") {
            setToast({ title: `Видео готово · ${prompt.slice(0, 48)}`, id });
            notify(`Видео готово · ${prompt.slice(0, 48)}`, `/app/c/${chat.id}`);
          }
          if (ev.type === "done" && (mode === "research" || mode === "slides")) notify(`${mode === "research" ? "Исследование" : "Слайды"} готово · ${prompt.slice(0, 40)}`, `/app/c/${chat.id}`);
        }
      } catch (e) {
        if ((e as DOMException).name === "AbortError") apply(id, { type: "aborted", costMicro: partialCost(chars) });
        else apply(id, { type: "error", message: "провайдер недоступен", refundedMicro: 0 });
      } finally {
        controllers.current.delete(id);
      }
    },
    [apply, chat.id],
  );

  // демо-данные: видео из истории продолжает генерироваться
  useEffect(() => {
    const pending = initial.filter((m) => m.parts.some((p) => p.type === "job" && p.status === "running"));
    // запуск вне тела эффекта: подписка на «внешний» поток задач
    const t = setTimeout(() => {
      for (const m of pending) {
        const job = m.parts.find((p) => p.type === "job");
        const prompt = textOf(initial.find((x) => x.id === m.parentId));
        if (job?.type === "job") void run(m.id, prompt, m.mode, job.progress);
      }
    }, 0);
    const ctrls = controllers.current;
    return () => {
      clearTimeout(t);
      ctrls.forEach((c) => c.abort());
    };
  }, [initial, run]);

  const lastLen = state.messages.length + JSON.stringify(state.runs).length;
  useEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [lastLen]);

  function startAnswer(parentId: string, prompt: string, mode: Mode, opts: SimOptions = {}) {
    const id = newId("a");
    const now = new Date().toISOString();
    const answer: Message = {
      id, chatId: chat.id, parentId, role: "assistant", mode, model: null, costMicro: 0, createdAt: now,
      parts: isJobMode(mode) ? [{ type: "job", jobId: newId("j"), kind: mode as "image" | "video", status: "queued", progress: 0 }] : [],
    };
    setState((s) => ({ ...s, messages: [...s.messages, answer], runs: { ...s.runs, [id]: newRun() }, head: id }));
    stickToBottom.current = true;
    lastOpts.current = opts;
    void run(id, prompt, mode, 0, opts);
  }

  function postUser(parentId: string | null, text: string, mode: Mode, files: FileMeta[], opts: SimOptions) {
    const uid = newId("u");
    const parts: Message["parts"] = [
      ...(text ? [{ type: "text" as const, text }] : []),
      ...files.map((f) => ({ type: "file" as const, name: f.name, sizeBytes: f.size, mime: f.type })),
    ];
    const user: Message = { id: uid, chatId: chat.id, parentId, role: "user", mode, model: null, costMicro: 0, createdAt: new Date().toISOString(), parts };
    setState((s) => ({ ...s, messages: [...s.messages, user], head: uid }));
    startAnswer(uid, text || files.map((f) => f.name).join(", "), mode, { ...opts, files });
  }

  function send(msg: Outgoing) {
    postUser(state.head, msg.text, msg.mode, msg.files, { model: msg.model.name, think: msg.think, web: msg.web, params: msg.params });
  }

  /** Изменить своё сообщение = новая ветка от того же родителя; старая сохраняется. */
  function editUser(m: Message, text: string) {
    setEditing(null);
    postUser(m.parentId, text, m.mode, [], lastOpts.current.model ? { model: lastOpts.current.model } : {});
  }

  function regenerate(m: Message) {
    if (!m.parentId) return;
    startAnswer(m.parentId, textOf(state.messages.find((x) => x.id === m.parentId)), m.mode, { model: lastOpts.current.model });
  }

  function answer(id: string, choice: number) {
    const resolve = askers.current.get(id);
    if (!resolve) return;
    askers.current.delete(id);
    resolve(choice);
  }

  // выбор реплики агента цифрой 1–3, пока он ждёт ответа и фокус не в поле ввода
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!/^[1-3]$/.test(e.key) || askers.current.size === 0) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName)) return;
      const [id] = [...askers.current.keys()];
      if (id) answer(id, Number(e.key) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function stop() {
    if (textStreaming) controllers.current.get(textStreaming.id)?.abort();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && textStreaming && controllers.current.get(textStreaming.id)?.abort();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [textStreaming]);

  // разделитель «дальше отвечает X» там, где сменилась модель ответа
  const dividers = new Set<string>();
  branch
    .filter((m) => m.role === "assistant" && m.model)
    .forEach((m, i, arr) => {
      const prev = arr[i - 1];
      if (prev && prev.model !== m.model) dividers.add(m.id);
    });

  return (
    <div className="flex min-h-0 flex-1">
    <main className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 pl-16 md:pl-6">
        <h1 className="truncate text-[14px]">
          <Decode text={chat.title} />
        </h1>
        <div className="flex shrink-0 items-center gap-3">
          <Label className="hidden tabular-nums sm:inline">
            #{chat.id.toUpperCase()} · {branch.length} сообщ. · {formatCredits(total)}
          </Label>
          <Link href={`/s/${chat.id}`} className="border border-line px-2.5 py-1 text-[12.5px] text-ink2 hover:border-acc-line hover:text-acc">
            Поделиться
          </Link>
        </div>
      </header>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
        className="flex-1 overflow-y-auto"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-6">
          {branch.map((m) => {
            if (m.role === "user") {
              const us = siblingsOf(m.id, state.messages);
              const ui = us.findIndex((x) => x.id === m.id);
              const goU = (i: number) => {
                const target = us[i];
                return target ? () => setState((s) => ({ ...s, head: leafOf(target.id, s.messages) })) : undefined;
              };
              return (
                <Appear key={m.id} index={initialIds.has(m.id) ? branch.indexOf(m) : 0}>
                <UserMessage
                  m={m}
                  editing={editing === m.id}
                  onEdit={() => setEditing(m.id)}
                  onCancel={() => setEditing(null)}
                  onSubmitEdit={(t) => editUser(m, t)}
                  versions={{ index: ui, total: us.length, prev: ui > 0 ? goU(ui - 1) : undefined, next: goU(ui + 1) }}
                />
                </Appear>
              );
            }
            const sibs = siblingsOf(m.id, state.messages);
            const idx = sibs.findIndex((x) => x.id === m.id);
            const go = (i: number) => {
              const target = sibs[i];
              return target ? () => setState((s) => ({ ...s, head: leafOf(target.id, s.messages) })) : undefined;
            };
            const divider = dividers.has(m.id) ? m.model : null;
            return (
              <Fragment key={m.id}>
                {divider && (
                  <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.06em] text-ink3 before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
                    дальше отвечает {divider}
                  </div>
                )}
                <Appear id={`msg-${m.id}`} index={initialIds.has(m.id) ? branch.indexOf(m) : 0}>
                  <AssistantMessage
                    m={m}
                    run={state.runs[m.id]}
                    versions={{ index: idx, total: sibs.length, prev: idx > 0 ? go(idx - 1) : undefined, next: go(idx + 1) }}
                    onRegenerate={() => regenerate(m)}
                    onImageAction={(a, i) => {
                      const alt = m.parts.filter((p) => p.type === "image")[i];
                      const what = alt?.type === "image" ? alt.alt : "картинку";
                      const opts = { ...lastOpts.current, files: [] };
                      if (a === "animate") postUser(state.head, `Оживи: ${what}`, "video", [], opts);
                      if (a === "variants") postUser(state.head, `Ещё варианты: ${what}`, "image", [], opts);
                      if (a === "upscale") postUser(state.head, `Увеличь до 4K: ${what}`, "image", [], { ...opts, params: { count: "1" } });
                    }}
                    onFollowup={(f) => {
                      const mode = modeForFollowup(f, m.mode);
                      postUser(state.head, f, mode, [], { ...lastOpts.current, files: [] });
                    }}
                    onAnswer={(c) => answer(m.id, c)}
                    onOpenArtifact={() => { const a = state.runs[m.id]?.artifact; if (a) setPanel(a); }}
                  />
                </Appear>
              </Fragment>
            );
          })}
          {branch.length === 0 && <p className="text-center text-ink3">Начните диалог — модель выберется автоматически.</p>}
        </div>
      </div>

      <div className="flex justify-center border-t border-line px-4 pt-3 pb-4">
        <Composer
          variant="dock"
          onSend={send}
          busy={!!textStreaming}
          onStop={stop}
          balanceMicro={balanceMicro}
          contextChars={Math.round(branch.reduce((n, m) => n + textOf(m).length, 0) * (compressed ? 0.3 : 1))}
          onCompress={() => setCompressed(true)}
          onEditLast={() => {
            const last = [...branch].reverse().find((m) => m.role === "user");
            if (last) setEditing(last.id);
          }}
        />
      </div>

      <AnimatePresence>
      {toast && (
        <IncomingToast
          title={toast.title}
          onClose={() => setToast(null)}
          onOpen={() => {
            document.getElementById(`msg-${toast.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            setToast(null);
          }}
        />
      )}
      </AnimatePresence>
    </main>
    <AnimatePresence>{panel && <SidePanel key="panel" artifact={panel} onClose={() => setPanel(null)} />}</AnimatePresence>
    </div>
  );
}
