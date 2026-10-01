import { readPrefs } from "./prefs";
import { isQuietHour } from "./quiet";

let ctx: AudioContext | null = null;

/**
 * Звуковой сигнал реального события: «готово» — два восходящих тона, «ошибка» — один низкий.
 * Звучит только если пользователь включил звук и сейчас не тихие часы.
 */
export function playSignal(kind: "done" | "error"): void {
  const prefs = readPrefs();
  if (!prefs.sound || (prefs.quiet && isQuietHour()) || typeof window === "undefined" || !("AudioContext" in window)) return;
  ctx ??= new AudioContext();
  const notes = kind === "done" ? [660, 990] : [220];
  notes.forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    const at = ctx!.currentTime + i * 0.09;
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.06, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(at);
    osc.stop(at + 0.18);
  });
}
