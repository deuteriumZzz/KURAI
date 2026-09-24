import type { Micro } from "@/types/api";

/** Тестовые промокоды; на бэкенде — таблица с лимитами и сроками. */
const CODES: Record<string, Micro> = { KURAI20: 2_000_000, START100: 1_000_000 };

export function redeem(code: string): { ok: true; bonusMicro: Micro } | { ok: false; error: string } {
  const c = code.trim().toUpperCase();
  if (!c) return { ok: false, error: "Введите промокод" };
  const bonus = CODES[c];
  return bonus ? { ok: true, bonusMicro: bonus } : { ok: false, error: "Такого промокода нет или он уже использован" };
}
