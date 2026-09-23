"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, RotateCcw } from "lucide-react";
import type { Message, MessagePart } from "@/types/api";
import type { RunState } from "@/lib/stream";
import { formatCredits } from "@/lib/format";
import { modeById } from "@/lib/modes";
import { StreamText } from "@/components/fx/decode";
import { Label, SysLine } from "@/components/fx/primitives";
import { Markdown } from "./markdown";
import { ImageGrid, JobCard, VideoCard } from "./media";
import { AgentChoice, AgentSummary, QuestLog, SourceNet } from "./agent";

const time = (iso: string) => new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const textOf = (m: Message) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");

export function UserMessage({ m }: { m: Message }) {
  return (
    <div className="ml-auto max-w-[85%] border border-line bg-g2 px-3.5 py-2.5 text-[14.5px] sm:max-w-[75%]">
      {m.mode !== "text" && <Label className="mb-1 block text-acc">{modeById(m.mode).label}</Label>}
      <p className="whitespace-pre-wrap">{textOf(m)}</p>
    </div>
  );
}

type Props = {
  m: Message;
  run?: RunState;
  versions: { index: number; total: number; prev?: () => void; next?: () => void };
  onRegenerate: () => void;
  onAnswer?: (choice: number) => void;
  onOpenArtifact?: () => void;
};

export function AssistantMessage({ m, run, versions, onRegenerate, onAnswer, onOpenArtifact }: Props) {
  const [copied, setCopied] = useState(false);
  const streaming = run?.status === "streaming";
  const text = textOf(m);
  const images = m.parts.filter((p): p is Extract<MessagePart, { type: "image" }> => p.type === "image");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <article className="group flex flex-col gap-2" aria-busy={streaming}>
      <div className="flex flex-wrap items-center gap-2.5">
        {m.model && <span className="border border-acc-line bg-acc-soft px-1.5 py-0.5 font-mono text-[11px] text-acc">{m.model}</span>}
        {versions.total > 1 && (
          <span className="inline-flex items-center font-mono text-[11px] text-ink2">
            <button type="button" onClick={versions.prev} disabled={!versions.prev} aria-label="Предыдущая версия" className="grid size-6 cursor-pointer place-items-center disabled:opacity-30">
              <ChevronLeft size={14} strokeWidth={1.5} />
            </button>
            {versions.index + 1} / {versions.total}
            <button type="button" onClick={versions.next} disabled={!versions.next} aria-label="Следующая версия" className="grid size-6 cursor-pointer place-items-center disabled:opacity-30">
              <ChevronRight size={14} strokeWidth={1.5} />
            </button>
          </span>
        )}
        {run?.status === "aborted" && (
          <span className="border border-warn/40 px-1.5 py-0.5 font-mono text-[11px] text-warn">ПРЕРВАНО · списано {formatCredits(m.costMicro)}</span>
        )}
      </div>

      {run?.log.map((l, i) => (
        <SysLine key={i} tone={l.tone} decode>
          {l.text}
        </SysLine>
      ))}

      {run?.ask && <AgentChoice ask={run.ask} onAnswer={(c) => onAnswer?.(c)} />}
      {run?.tasks && <QuestLog tasks={run.tasks} />}
      {run?.sources && run.sources.length > 0 && <SourceNet sources={run.sources} />}
      {m.parts.map((p, i) => {
        if (p.type === "text")
          return streaming ? (
            <div key={i} className="text-[14.5px] leading-relaxed">
              <StreamText text={p.text} done={false} />
            </div>
          ) : (
            <Markdown key={i} text={p.text} />
          );
        if (p.type === "job") return <JobCard key={i} job={p} queuePosition={run?.queuePosition} tip={run?.tip} />;
        if (p.type === "video") return <VideoCard key={i} video={p} />;
        return null;
      })}
      {images.length > 0 && <ImageGrid images={images} />}
      {run?.status === "done" && run.tasks && <AgentSummary run={run} costMicro={m.costMicro} onOpenArtifact={onOpenArtifact} />}
      {streaming && text === "" && !run?.ask && m.parts.every((p) => p.type === "text") && (
        <span aria-hidden="true" className="fx-caret font-mono text-acc">▍</span>
      )}

      {!streaming && (
        <div className="flex flex-wrap items-center gap-1 text-[12px] text-ink3">
          {text && (
            <button type="button" onClick={copy} className="inline-flex h-7 cursor-pointer items-center gap-1.5 px-1.5 hover:text-ink pointer-coarse:h-11">
              {copied ? <Check size={13} strokeWidth={1.5} /> : <Copy size={13} strokeWidth={1.5} />}
              {copied ? "Скопировано" : "Копировать"}
            </button>
          )}
          <button type="button" onClick={onRegenerate} className="inline-flex h-7 cursor-pointer items-center gap-1.5 px-1.5 hover:text-ink pointer-coarse:h-11">
            <RotateCcw size={13} strokeWidth={1.5} /> Перегенерировать
          </button>
          <span className="ml-1 font-mono text-[11px] opacity-0 transition-opacity duration-(--dur-fast) group-hover:opacity-100 group-focus-within:opacity-100">
            {time(m.createdAt)} · {formatCredits(m.costMicro)}
            {run?.durationMs ? ` · ${(run.durationMs / 1000).toFixed(1).replace(".", ",")} с` : ""}
          </span>
        </div>
      )}
    </article>
  );
}
