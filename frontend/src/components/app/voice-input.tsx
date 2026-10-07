"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Mic, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { vibrate } from "@/lib/haptics";
import { Hint } from "./hint";

type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type SRCtor = new () => SR;

function getSR(): SRCtor | null {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

type Props = {
  /** Текст распознаётся по ходу речи; final — фраза закончена. */
  onText: (text: string) => void;
  /** Браузер не умеет распознавать — отдаём запись как аудиофайл (распознает сервер). */
  onAudio: (file: File) => void;
  onError: (message: string) => void;
  onActiveChange: (active: boolean) => void;
};

/**
 * Голосовой ввод: микрофон → уровень сигнала шкалой, таймер, текст появляется в поле ввода.
 * Chrome/Safari распознают сами (ru-RU), в остальных браузерах запись уходит на сервер как аудио.
 */
export function VoiceInput({ onText, onAudio, onError, onActiveChange }: Props) {
  const [active, setActive] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => Array(16).fill(0));
  const [secs, setSecs] = useState(0);
  const stopAll = useRef<(commit: boolean) => void>(() => {});
  const held = useRef(false);

  useEffect(() => onActiveChange(active), [active, onActiveChange]);

  async function start() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError("Нет доступа к микрофону — разрешите его в настройках браузера");
      return;
    }
    setActive(true);
    setSecs(0);

    // уровень сигнала для шкалы
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;
    const loop = () => {
      analyser.getByteFrequencyData(buf);
      setLevels(Array.from({ length: 16 }, (_, i) => (buf[i + 2] ?? 0) / 255));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const timer = setInterval(() => setSecs((s) => s + 1), 1000);

    const SRC = getSR();
    let rec: SR | null = null;
    let recorder: MediaRecorder | null = null;
    const chunks: Blob[] = [];
    let committed = "";

    if (SRC) {
      rec = new SRC();
      rec.lang = "ru-RU";
      rec.interimResults = true;
      rec.continuous = true;
      rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (!r) continue;
          if (r.isFinal) committed += r[0].transcript;
          else interim += r[0].transcript;
        }
        onText((committed + interim).trim());
      };
      rec.onerror = (e) => e.error !== "aborted" && e.error !== "no-speech" && onError("Не удалось распознать речь — попробуйте ещё раз");
      rec.start();
    } else {
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.start();
    }

    stopAll.current = (commit: boolean) => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      rec?.[commit ? "stop" : "abort"]();
      if (recorder) {
        recorder.onstop = () => {
          if (commit && chunks.length) onAudio(new File(chunks, `голосовое-${Date.now()}.webm`, { type: "audio/webm" }));
        };
        recorder.stop();
      }
      if (!commit) onText("");
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
      setActive(false);
      setLevels(Array(16).fill(0));
    };
  }

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stopAll.current(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  useEffect(() => () => stopAll.current(false), []);

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => {
          if (held.current) {
            held.current = false;
            return;
          }
          void start();
        }}
        onPointerDown={(e) => {
          // на телефоне — как рация: держите, говорите, отпустите
          if (e.pointerType !== "touch") return;
          held.current = true;
          // 82 — короткий отклик: удержание распознано, запись началась
          vibrate(15);
          void start().then(() => {
            const up = () => {
              window.removeEventListener("pointerup", up);
              stopAll.current(true);
            };
            window.addEventListener("pointerup", up);
          });
        }}
        aria-label="Голосовой ввод (на телефоне — удерживайте)"
        className="relative grid size-8 cursor-pointer place-items-center rounded-(--radius-field) text-ink2 hover:bg-s2 hover:text-ink pointer-coarse:size-11"
      >
        <Mic size={16} strokeWidth={1.5} />
        <Hint k="Голос" />
      </button>
    );
  }

  return (
    <div role="status" aria-label="Идёт запись голоса" className="flex h-8 items-center gap-2 rounded-(--radius-sm) border border-acc-line bg-acc-soft px-2 pointer-coarse:h-11">
      <span aria-hidden="true" className="fx-caret size-2 bg-acc" />
      <span aria-hidden="true" className="flex h-4 items-end gap-0.5">
        {levels.map((l, i) => (
          <i key={i} className={cn("w-[3px] rounded-full transition-[height,background-color] duration-75", l > 0.08 ? "bg-acc" : "bg-line2")} style={{ height: `${Math.max(15, Math.round(l * 100))}%` }} />
        ))}
      </span>
      <span className="font-mono text-[11px] text-acc tabular-nums">{fmt(secs)}</span>
      <button type="button" onClick={() => stopAll.current(false)} aria-label="Отменить запись (Esc)" className="grid size-6 cursor-pointer place-items-center text-ink2 hover:text-ink pointer-coarse:size-9">
        <X size={14} strokeWidth={1.5} />
      </button>
      <button type="button" onClick={() => stopAll.current(true)} aria-label="Готово" className="grid size-6 cursor-pointer place-items-center text-acc pointer-coarse:size-9">
        <Check size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
