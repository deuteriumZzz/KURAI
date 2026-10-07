"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Bookmark, ChevronDown, ExternalLink, FileText, SlidersHorizontal, X } from "lucide-react";
import type { Message } from "@/types/api";
import type { RunState } from "@/lib/stream";
import type { Fork } from "@/lib/tree";
import { DISPLAY_TZ, formatBytes, formatCredits, hostOf, webHref } from "@/lib/format";
import { contextUsage } from "@/lib/context";
import { GROUP_LABEL, modelByName, routeLabel } from "@/lib/models";
import { openLightbox } from "@/lib/app-state";
import { ModelGlyph, glyphKind } from "@/components/brand/model-glyph";
import { Segments } from "@/components/fx/primitives";
import { cn } from "@/lib/cn";
import { SPRING } from "@/lib/motion";
import { TaskMap } from "./task-map";

const nowMs = () => Date.now();
const DAY = 86_400_000;
/** 105 — когда источник получен: момент ответа, который его прочитал; старше месяца — тихая пометка. */
function received(iso: string): { label: string; stale: boolean } {
  const at = Date.parse(iso);
  const ago = nowMs() - at;
  const day = new Date(at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: DISPLAY_TZ });
  const rel = ago < 3_600_000 ? "только что" : ago < DAY ? `${Math.round(ago / 3_600_000)} ч назад` : `${Math.round(ago / DAY)} дн. назад`;
  return { label: `прочитано ${day} · ${rel}`, stale: ago > 30 * DAY };
}
const textOf = (m: Message) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
/** 103 — подсветка места в чате, на которое наведён пункт «Что видела модель». */
const peek = (id: string, on: boolean) => {
  const el = document.getElementById(`msg-${id}`) ?? document.querySelector(`[data-msg="${id}"]`);
  if (on) el?.setAttribute("data-peek", "");
  else el?.removeAttribute("data-peek");
};

type Props = {
  branch: Message[];
  runs: Record<string, RunState>;
  totalMicro: number;
  contextChars: number;
  onJump: (id: string) => void;
  onFollowup: (text: string) => void;
  /** Реальные развилки активной ветки (Branch Map) и переход на другую версию. */
  forks?: Fork[];
  onSwitchBranch?: (id: string) => void;
  /** Лист на планшете/телефоне — с кнопкой закрытия. */
  onClose?: () => void;
  className?: string;
  /** 8 — номера сносок в зоне чтения: их источники подсвечены. */
  reading?: number[];
  /** 91 — закладки на абзацы ответов этой ветки. */
  bookmarks?: { id: string; msgId: string; quote: string }[];
  onBookmark?: (b: { id: string; msgId: string; quote: string }) => void;
  onRemoveBookmark?: (id: string) => void;
  /** 103 — инструкции проекта тоже уходят в запрос (системным сообщением). */
  instructions?: string;
};


/**
 * Inspector: что реально видел и сделал выбранный запуск — маршрут, цена, контекст,
 * источники, файлы, медиа и продолжения. Модуль появляется, только когда у него есть данные.
 */
export function Inspector({ branch, runs, totalMicro, contextChars, onJump, onFollowup, forks = [], onSwitchBranch, onClose, className, reading = [], bookmarks = [], onBookmark, onRemoveBookmark, instructions }: Props) {
  const [allSources, setAllSources] = useState(false);
  const answers = branch.filter((m) => m.role === "assistant");
  const lastRouted = [...answers].reverse().find((m) => m.model);
  const info = lastRouted?.model ? modelByName(lastRouted.model) : undefined;
  const usage = info ? contextUsage(contextChars, info.contextK) : 0;

  // Нумерация источников совпадает со сносками последнего ответа, у которого они есть.
  const citing = [...answers].reverse().find((m) => (runs[m.id]?.sources?.length ?? 0) > 0);
  const sources = citing ? (runs[citing.id]?.sources ?? []) : [];
  const shown = allSources ? sources : sources.slice(0, 3);

  const files = branch.flatMap((m) => m.parts.flatMap((p) => (p.type === "file" ? [{ m, p }] : [])));
  const images = branch.flatMap((m) => m.parts.flatMap((p, i) => (p.type === "image" ? [{ id: `${m.id}-${i}`, src: p.url, alt: p.alt, kind: "image" as const }] : [])));
  const videos = branch.flatMap((m) => m.parts.flatMap((p) => (p.type === "video" ? [{ m, p }] : [])));
  const lastRun = answers.at(-1) ? runs[answers.at(-1)!.id] : undefined;
  const followups = lastRun?.status === "done" ? (lastRun.followups ?? []) : [];
  const [showMap, setShowMap] = useState(false);
  const planned = [...answers].reverse().map((m) => runs[m.id]?.tasks).find(Boolean) ?? [];
  // 103 — что ушло в последний запрос: сообщения ветки до последнего ответа, ≈ токены по символам
  const lastAnswer = answers.at(-1);
  const seen = lastAnswer ? branch.slice(0, branch.indexOf(lastAnswer)) : [];
  const seenItems = seen.map((m) => ({ m, tokens: Math.ceil(textOf(m).length / 4), files: m.parts.filter((p) => p.type === "file").length }));
  const instructionTokens = instructions ? Math.ceil(instructions.length / 4) : 0;
  const seenTotal = seenItems.reduce((n, x) => n + x.tokens, 0) + instructionTokens;
  const seenMax = Math.max(1, ...seenItems.map((x) => x.tokens));

  return (
    <aside aria-label="Контекст задачи" className={cn("k-inspector flex w-[340px] shrink-0 flex-col overflow-y-auto", className)}>
      {onClose && (
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
          <span className="text-[14px] text-ink">Контекст задачи</span>
          <button type="button" onClick={onClose} aria-label="Закрыть контекст" className="k-act">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {lastRouted?.model && (
        <section aria-label="Маршрут" className="k-module p-5">
          <div className="rounded-(--radius-md) border border-line bg-g1 p-4">
            <div className="flex items-center gap-3">
              <span data-route-glyph-target className="grid size-10 place-items-center rounded-(--radius-sm) border border-line bg-bg">
                <ModelGlyph id={info?.id ?? lastRouted.model} kind={glyphKind(info?.group)} size={24} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] text-ink">{routeLabel(lastRouted.model)}</span>
                <span className="block text-[12.5px] text-ink3">{info ? `${GROUP_LABEL[info.group]} · ${info.provider}` : "Модель из каталога OpenRouter"}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  // в листе сначала закрываем его: Model Bay живёт у поля ввода, под листом
                  onClose?.();
                  window.setTimeout(() => window.dispatchEvent(new CustomEvent("kurai:open-bay")), onClose ? 220 : 0);
                }}
                aria-label="Сменить маршрут для следующего запроса"
                data-tip="Сменить маршрут"
                className="k-act"
              >
                <SlidersHorizontal size={16} strokeWidth={1.5} />
              </button>
            </div>
            {info && <p className="mt-3 text-[13px] leading-relaxed text-ink2">{info.note}</p>}
          </div>
          <dl className="mt-4 flex flex-col gap-2.5 text-[13px]">
            {info && info.contextK > 0 && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink3">Контекстное окно</dt>
                <dd className="font-mono text-[12.5px] text-ink">{info.contextK >= 1000 ? `${info.contextK / 1000}M` : `${info.contextK}K`}</dd>
              </div>
            )}
            {info && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink3">Обычно за запрос</dt>
                <dd className="font-mono text-[12.5px] text-ink">{formatCredits(info.priceHintMicro, { approx: true })}</dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink3">Потрачено в задаче</dt>
              <dd className="font-mono text-[12.5px] text-ink">{formatCredits(totalMicro)}</dd>
            </div>
          </dl>
          {info && info.contextK > 0 && contextChars > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[12px] text-ink3">
                <span>Контекст занят</span>
                <span className={cn("font-mono tabular-nums", usage >= 0.8 && "text-warn")}>{Math.max(1, Math.round(usage * 100))}%</span>
              </div>
              <Segments value={usage} count={20} tone={usage >= 0.8 ? "warn" : "acc"} label="Заполненность контекста модели" />
            </div>
          )}
        </section>
      )}

      {sources.length > 0 && (
        <section aria-label="Источники" className="k-module p-5">
          <h2 className="mb-3 flex items-center gap-2 text-[14px] text-ink">
            Источники <span className="font-mono text-[12px] text-violet">{sources.length}</span>
          </h2>
          {/* 28 — источники появляются узлами по мере чтения и пристраиваются к общей линии */}
          <ul className="k-src-tree -mx-2 flex flex-col gap-1">
            <AnimatePresence initial={false}>
            {shown.map((s, i) => (
              <motion.li
                key={s.url}
                layout="position"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={SPRING.gentle}
                data-n={i + 1}
                data-reading={reading.includes(i + 1) || undefined}
                className="k-src k-scan"
              >
                <a href={webHref(s.url)} target="_blank" rel="noopener noreferrer" className="group flex gap-3 p-2">
                  <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-(--radius-sm) border border-violet-line bg-violet-soft font-mono text-[12px] text-violet uppercase">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] leading-snug text-ink">{s.title}</span>
                    <span className="mt-0.5 block truncate font-mono text-[11.5px] text-violet">{hostOf(s.url)}</span>
                    {(() => {
                      // 28 — сколько утверждений ответа опирается на этот источник (по сноскам в тексте)
                      const claims = citing ? (textOf(citing).match(new RegExp(`\\[${i + 1}\\](?!\\()`, "g"))?.length ?? 0) : 0;
                      return claims > 0 ? <span className="mt-0.5 block text-[11px] text-violet">→ подтверждает {claims} {claims === 1 ? "утверждение" : claims < 5 ? "утверждения" : "утверждений"}</span> : null;
                    })()}
                    {citing && (() => {
                      // 105 — точное время чтения источника, если сервер его прислал; иначе — время ответа
                      const r = received(s.readAt ?? citing.createdAt);
                      return <span className={cn("mt-0.5 block text-[11px]", r.stale ? "text-warn" : "text-ink3")}>{r.label}{r.stale && " · может устареть"}</span>;
                    })()}
                  </span>
                  <ExternalLink size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-ink3 group-hover:text-ink" aria-hidden="true" />
                </a>
              </motion.li>
            ))}
            </AnimatePresence>
          </ul>
          {sources.length > 3 && (
            <button type="button" onClick={() => setAllSources((v) => !v)} aria-expanded={allSources} className="mt-2 flex h-10 w-full cursor-pointer items-center justify-between rounded-(--radius-sm) border border-line px-3 text-[13px] text-ink2 hover:border-line2 hover:text-ink">
              {allSources ? "Свернуть" : `Показать все источники · ${sources.length}`}
              <ChevronDown size={14} strokeWidth={1.5} className={cn("transition-transform duration-(--dur-fast)", allSources && "rotate-180")} />
            </button>
          )}
          {citing && (
            <button type="button" onClick={() => onJump(citing.id)} className="mt-3 cursor-pointer text-[12.5px] text-ink3 underline decoration-line2 underline-offset-4 hover:text-ink">
              К ответу с этими источниками
            </button>
          )}
        </section>
      )}

      {seenItems.length > 0 && (
        <section aria-label="Что видела модель" className="k-module p-5">
          <h2 className="mb-1 flex items-center justify-between text-[14px] text-ink">
            Что видела модель <span className="font-mono text-[12px] text-ink3">≈ {seenTotal.toLocaleString("ru-RU")} ток.</span>
          </h2>
          <p className="mb-3 text-[12px] text-ink3">Последний запрос: сообщения ветки, оценка по символам.</p>
          <ul className="flex flex-col gap-1.5">
            {instructionTokens > 0 && (
              <li className="px-1 py-1">
                <span className="flex items-center justify-between gap-3 text-[12.5px]">
                  <span className="min-w-0 truncate text-ink2">Инструкции проекта</span>
                  <span className="shrink-0 font-mono text-[11px] text-ink3">≈ {instructionTokens}</span>
                </span>
                <span aria-hidden="true" className="mt-1 block h-1 rounded-full bg-s2">
                  <span className="block h-full rounded-full bg-acc" style={{ width: `${Math.max(2, (instructionTokens / Math.max(seenMax, instructionTokens)) * 100)}%` }} />
                </span>
              </li>
            )}
            {seenItems.map(({ m, tokens, files: fileCount }) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onJump(m.id)}
                  onMouseEnter={() => peek(m.id, true)}
                  onMouseLeave={() => peek(m.id, false)}
                  onFocus={() => peek(m.id, true)}
                  onBlur={() => peek(m.id, false)}
                  className="w-full cursor-pointer rounded-(--radius-sm) px-1 py-1 text-left hover:bg-s2"
                >
                  <span className="flex items-center justify-between gap-3 text-[12.5px]">
                    <span className="min-w-0 truncate text-ink2">{m.role === "user" ? "Вопрос" : "Ответ"} · {textOf(m).slice(0, 40) || "без текста"}</span>
                    <span className="shrink-0 font-mono text-[11px] text-ink3">{fileCount > 0 ? `${fileCount} ф. · ` : ""}≈ {tokens}</span>
                  </span>
                  <span aria-hidden="true" className="mt-1 block h-1 rounded-full bg-s2">
                    <span className={cn("block h-full rounded-full", m.role === "user" ? "bg-ink3" : "bg-violet")} style={{ width: `${Math.max(2, (tokens / seenMax) * 100)}%` }} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {planned.length + sources.length + files.length >= 3 && (
        <section aria-label="Карта задачи" className="k-module p-5">
          <button type="button" onClick={() => setShowMap((v) => !v)} aria-expanded={showMap} className="flex w-full cursor-pointer items-center justify-between text-[14px] text-ink">
            Карта задачи
            <ChevronDown size={14} strokeWidth={1.5} className={cn("text-ink3 transition-transform duration-(--dur-fast)", showMap && "rotate-180")} />
          </button>
          {showMap && (
            <div className="mt-3">
              <TaskMap tasks={planned} sources={sources} files={files.map(({ p }) => p.name)} />
              <p className="mt-2 flex gap-3 text-[11px] text-ink3">
                <span><i className="mr-1 inline-block size-2 rounded-full bg-acc" />шаги</span>
                <span><i className="mr-1 inline-block size-2 rounded-full bg-violet" />источники</span>
                <span><i className="mr-1 inline-block size-2 rounded-full bg-ink3" />файлы</span>
              </p>
            </div>
          )}
        </section>
      )}

      {bookmarks.length > 0 && onBookmark && (
        <section aria-label="Закладки" className="k-module p-5">
          <h2 className="mb-2 flex items-center gap-2 text-[14px] text-ink">
            Закладки <span className="font-mono text-[12px] text-ink3">{bookmarks.length}</span>
          </h2>
          <ul className="k-stagger -mx-2 flex flex-col">
            {bookmarks.map((b) => (
              <li key={b.id} className="group flex items-start gap-1">
                <button type="button" onClick={() => onBookmark(b)} className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 rounded-(--radius-sm) px-2 py-2 text-left text-[13px] text-ink2 hover:bg-s2 hover:text-ink">
                  <Bookmark size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-acc" fill="currentColor" />
                  <span className="line-clamp-2">{b.quote}</span>
                </button>
                {onRemoveBookmark && (
                  <button type="button" onClick={() => onRemoveBookmark(b.id)} aria-label="Убрать закладку" className="k-act mt-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100">
                    <X size={13} strokeWidth={1.5} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {forks.length > 0 && onSwitchBranch && (
        <section aria-label="Ветки" className="k-module p-5">
          <h2 className="mb-3 flex items-center gap-2 text-[14px] text-ink">
            Ветки <span className="font-mono text-[12px] text-ink3">{forks.length}</span>
          </h2>
          <ol className="ml-1 border-l border-line">
            {forks.map((f, i) => (
              <li key={f.activeId} className="relative pb-3 pl-5 last:pb-0">
                <span aria-hidden="true" className="absolute top-1 -left-[5px] size-[9px] border border-line2 bg-bg" />
                <p className="k-index mb-1.5">Развилка {i + 1} · {f.role === "user" ? "реплика" : "ответ"}</p>
                <ul className="flex flex-col">
                  {f.versions.map((v, n) => {
                    const text = v.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();
                    const label = f.role === "user" ? text.slice(0, 60) || `Версия ${n + 1}` : `${v.model ?? "Автомаршрут"} · версия ${n + 1}`;
                    const active = v.id === f.activeId;
                    return (
                      <li key={v.id}>
                        <button
                          type="button"
                          onClick={() => onSwitchBranch(v.id)}
                          aria-current={active ? "true" : undefined}
                          className={cn("k-chat-row block w-full cursor-pointer truncate rounded-(--radius-sm) py-1.5 pr-2 pl-3 text-left text-[13px]", active ? "bg-s2 text-ink" : "text-ink2 hover:bg-s1 hover:text-ink")}
                        >
                          {label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      )}

      {files.length > 0 && (
        <section aria-label="Файлы" className="k-module p-5">
          <h2 className="mb-3 flex items-center gap-2 text-[14px] text-ink">
            Файлы <span className="font-mono text-[12px] text-ink3">{files.length}</span>
          </h2>
          <ul className="flex flex-col gap-1">
            {files.map(({ m, p }) => (
              <li key={`${m.id}-${p.name}`}>
                <button type="button" onClick={() => onJump(m.id)} className="flex w-full cursor-pointer items-center gap-3 rounded-(--radius-sm) p-2 text-left hover:bg-s2">
                  <FileText size={16} strokeWidth={1.5} className="shrink-0 text-ink3" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink2">{p.name}</span>
                  <span className="font-mono text-[11px] text-ink3">{formatBytes(p.sizeBytes)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {images.length + videos.length > 0 && (
        <section aria-label="Медиа" className="k-module p-5">
          <h2 className="mb-3 flex items-center gap-2 text-[14px] text-ink">
            Медиа <span className="font-mono text-[12px] text-signal">{images.length + videos.length}</span>
          </h2>
          <div className="grid grid-cols-3 gap-1.5">
            {images.map((img, i) => (
              <button key={img.id} type="button" onClick={() => openLightbox(images, i)} aria-label={`Открыть: ${img.alt}`} className="aspect-square cursor-zoom-in overflow-hidden rounded-(--radius-sm) bg-s2 hover:opacity-85">
                {/* eslint-disable-next-line @next/next/no-img-element -- локальные превью */}
                <img src={img.src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
            {videos.map(({ m, p }) => (
              <button key={m.id} type="button" onClick={() => onJump(m.id)} aria-label="Перейти к видео" className="relative aspect-square overflow-hidden rounded-(--radius-sm) bg-s2 hover:opacity-85">
                {/* eslint-disable-next-line @next/next/no-img-element -- постер */}
                {p.poster && <img src={p.poster} alt="" className="h-full w-full object-cover" />}
                <span className="absolute right-1 bottom-1 bg-bg/85 px-1 font-mono text-[9.5px] text-ink">{p.durationSec} с</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {followups.length > 0 && (
        <section aria-label="Продолжить работу" className="k-module p-5">
          <h2 className="mb-2 flex items-center justify-between text-[14px] text-ink">
            Продолжить работу <span className="text-[11.5px] text-ink3">клавиши 1–4 — в поле ввода</span>
          </h2>
          {/* К15 — продолжения как реплики диалога: пронумерованы, главное подсвечено */}
          <ul className="k-stagger -mx-2 flex flex-col">
            {followups.slice(0, 4).map((f, i) => (
              <li key={f}>
                <button type="button" onClick={() => onFollowup(f)} className={cn("group flex w-full cursor-pointer items-center gap-3 rounded-(--radius-sm) px-2 py-2.5 text-left text-[13.5px] hover:bg-s2", i === 0 ? "text-acc" : "text-ink2 hover:text-ink")}>
                  <span className={cn("k-kbd shrink-0", i === 0 && "border-acc-line text-acc")}>{i + 1}</span>
                  <span className="flex-1">{f}</span>
                  <ArrowRight size={15} strokeWidth={1.5} className="shrink-0 transition-transform duration-(--dur-fast) group-hover:translate-x-0.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!lastRouted?.model && sources.length + files.length + images.length + videos.length === 0 && (
        <p className="p-5 text-[13px] leading-relaxed text-ink3">Здесь появятся маршрут, цена и источники, как только модель ответит.</p>
      )}
    </aside>
  );
}
