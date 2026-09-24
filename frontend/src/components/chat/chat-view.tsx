"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ChatSummary, Message, Mode } from "@/types/api";
import { applyEvent, newRun, type RunState, type StreamEvent } from "@/lib/stream";
import { branchOf, leafOf, siblingsOf } from "@/lib/tree";
import { modeForFollowup } from "@/lib/modes";
import { findMatches } from "@/lib/search";
import { useTabStatus } from "@/lib/use-tab-status";
import { markStep, readPrefs } from "@/lib/prefs";
import { retrigger } from "@/lib/motion";
import { ChevronDown, ChevronUp, Pin, Search, X } from "lucide-react";
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
import { SelectionMenu } from "./selection-menu";
import { AnimatePresence, motion } from "motion/react";
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
  const [below, setBelow] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hit, setHit] = useState(0);
  const [pinned, setPinned] = useState<string[]>([]);
  const [compare, setCompare] = useState<Record<string, string>>({});

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
            // системное уведомление, если вкладка свёрнута и пользователь разрешил
            if (document.hidden && readPrefs().notifyBrowser && typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification("KURAI · видео готово", { body: prompt.slice(0, 80), icon: "/icon.svg" });
            }
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
    return id;
  }

  function postUser(parentId: string | null, text: string, mode: Mode, files: FileMeta[], opts: SimOptions) {
    const uid = newId("u");
    const parts: Message["parts"] = [
      ...(text ? [{ type: "text" as const, text }] : []),
      ...files.map((f) => ({ type: "file" as const, name: f.name, sizeBytes: f.size, mime: f.type })),
    ];
    const user: Message = { id: uid, chatId: chat.id, parentId, role: "user", mode, model: null, costMicro: 0, createdAt: new Date().toISOString(), parts };
    setState((s) => ({ ...s, messages: [...s.messages, user], head: uid }));
    return startAnswer(uid, text || files.map((f) => f.name).join(", "), mode, { ...opts, files });
  }

  function send(msg: Outgoing) {
    markStep(msg.mode === "image" ? "image" : msg.mode === "video" ? "video" : "text");
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

  // вкладка браузера: прогресс самой долгой активной задачи
  const activeJob = state.messages
    .map((m) => ({ m, job: m.parts.find((p) => p.type === "job") }))
    .find(({ m, job }) => job?.type === "job" && state.runs[m.id]?.status === "streaming");
  const jobLabel =
    activeJob?.job?.type === "job"
      ? `${activeJob.job.kind === "video" ? "Видео" : "Изображение"} ${Math.round(activeJob.job.progress * 100)}%`
      : textStreaming
        ? "Отвечает"
        : null;
  useTabStatus(jobLabel);

  const matches = findMatches(branch.map(textOf), query);
  const pinnedMsgs = branch.filter((m) => pinned.includes(m.id));

  function scrollToMsg(id: string) {
    const el = document.getElementById(`msg-${id}`) ?? document.querySelector(`[data-msg="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    retrigger(el?.querySelector("article, div") ?? null, "fx-flicker-border");
  }

  function jump(d: number) {
    if (!matches.length) return;
    const next = (hit + d + matches.length) % matches.length;
    setHit(next);
    const m = branch[matches[next] ?? 0];
    if (m) scrollToMsg(m.id);
  }

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
    <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 pl-16 md:pl-6">
        <h1 className="truncate text-[14px]">
          <Decode text={chat.title} />
        </h1>
        <div className="flex shrink-0 items-center gap-3">
          <Label className="hidden tabular-nums sm:inline">
            #{chat.id.toUpperCase()} · {branch.length} сообщ. · {formatCredits(total)}
          </Label>
          <button
            type="button"
            onClick={() => setFindOpen((o) => !o)}
            aria-label="Поиск по чату"
            aria-expanded={findOpen}
            data-tip="Поиск по чату"
            className="grid size-8 cursor-pointer place-items-center border border-line text-ink2 hover:border-acc-line hover:text-acc pointer-coarse:size-11"
          >
            <Search size={14} strokeWidth={1.5} />
          </button>
          <Link href={`/s/${chat.id}`} onClick={() => markStep("share")} className="border border-line px-2.5 py-1 text-[12.5px] text-ink2 hover:border-acc-line hover:text-acc">
            Поделиться
          </Link>
        </div>
      </header>
      {findOpen && (
        <div className="flex items-center gap-2 border-b border-line bg-g1 px-4 py-2 md:px-6">
          <span aria-hidden="true" className="font-mono text-acc">›</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHit(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") jump(e.shiftKey ? -1 : 1);
              if (e.key === "Escape") setFindOpen(false);
            }}
            aria-label="Найти в чате"
            placeholder="найти в этом чате…"
            className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-ink outline-none placeholder:text-ink3"
          />
          <span className="font-mono text-[11px] text-ink3 tabular-nums" aria-live="polite">
            {query ? (matches.length ? `${Math.min(hit, matches.length - 1) + 1} из ${matches.length}` : "нет совпадений") : ""}
          </span>
          <button type="button" onClick={() => jump(-1)} aria-label="Предыдущее совпадение" className="grid size-7 cursor-pointer place-items-center text-ink2 hover:text-ink">
            <ChevronUp size={14} strokeWidth={1.5} />
          </button>
          <button type="button" onClick={() => jump(1)} aria-label="Следующее совпадение" className="grid size-7 cursor-pointer place-items-center text-ink2 hover:text-ink">
            <ChevronDown size={14} strokeWidth={1.5} />
          </button>
          <button type="button" onClick={() => setFindOpen(false)} aria-label="Закрыть поиск" className="grid size-7 cursor-pointer place-items-center text-ink2 hover:text-ink">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      )}
      {pinnedMsgs.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto border-b border-line px-4 py-2 md:px-6">
          <Pin size={12} strokeWidth={1.5} className="shrink-0 text-acc" aria-hidden="true" />
          {pinnedMsgs.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => scrollToMsg(m.id)}
              className="max-w-56 shrink-0 cursor-pointer truncate border border-line bg-g1 px-2 py-0.5 text-[12px] text-ink2 hover:border-acc-line hover:text-ink"
            >
              {textOf(m).slice(0, 60) || m.model}
            </button>
          ))}
        </div>
      )}

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          setBelow(!stickToBottom.current);
        }}
        className="relative flex-1 overflow-y-auto"
      >
        <div className="mx-auto flex w-full max-w-[var(--read-width,48rem)] flex-col gap-6 px-4 py-6 text-[length:var(--read-size,15px)] md:px-6">
          <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.1em] text-ink3 uppercase before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
            {new Date(branch[0]?.createdAt ?? chat.updatedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" })}
          </div>
          {branch.map((m) => {
            if (m.role === "user") {
              const us = siblingsOf(m.id, state.messages);
              const ui = us.findIndex((x) => x.id === m.id);
              const goU = (i: number) => {
                const target = us[i];
                return target ? () => setState((s) => ({ ...s, head: leafOf(target.id, s.messages) })) : undefined;
              };
              return (
                <Appear key={m.id} data-msg={m.id} index={initialIds.has(m.id) ? branch.indexOf(m) : 0}>
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
                    pinned={pinned.includes(m.id)}
                    compareBefore={compare[m.id]}
                    onPin={() => setPinned((p) => (p.includes(m.id) ? p.filter((x) => x !== m.id) : [...p, m.id]))}
                    onImageAction={(a, i) => {
                      const alt = m.parts.filter((p) => p.type === "image")[i];
                      const what = alt?.type === "image" ? alt.alt : "картинку";
                      const opts = { ...lastOpts.current, files: [] };
                      if (a === "animate") postUser(state.head, `Оживи: ${what}`, "video", [], opts);
                      if (a === "variants") postUser(state.head, `Ещё варианты: ${what}`, "image", [], opts);
                      if (a === "upscale") {
                        const aid = postUser(state.head, `Увеличь до 4K: ${what}`, "image", [], { ...opts, params: { count: "1" } });
                        const src = alt?.type === "image" ? alt.url : undefined;
                        if (src) setCompare((c) => ({ ...c, [aid]: src }));
                      }
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

      <SelectionMenu
        root={scroller}
        onAction={(a, text) => {
          const quote = text.length > 300 ? `${text.slice(0, 300)}…` : text;
          const opts = { ...lastOpts.current, files: [] };
          if (a === "explain") postUser(state.head, `Объясни проще: «${quote}»`, "text", [], opts);
          else if (a === "translate") postUser(state.head, `Переведи на английский: «${quote}»`, "text", [], opts);
          else window.dispatchEvent(new CustomEvent("kurai:prefill", { detail: a === "quote" ? `> ${quote}\n\n` : `Про фрагмент «${quote}»: ` }));
        }}
      />
      <AnimatePresence>
        {below && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={() => {
              const el = scroller.current;
              el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
            }}
            className="absolute bottom-40 left-1/2 z-10 -translate-x-1/2 cursor-pointer border border-acc-line bg-g2 px-3 py-1.5 font-mono text-[12px] text-acc shadow-[0_12px_30px_-12px_rgb(0_0_0/0.8)] hover:bg-acc hover:text-acc-ink"
          >
            ↓ Вниз {textStreaming ? "· идёт ответ" : ""}
          </motion.button>
        )}
      </AnimatePresence>
      <div className="flex justify-center border-t border-line bg-bg px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Composer
          variant="dock"
          draftKey={chat.id}
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
