/** Грубая оценка токенов: для смешанного русского/английского текста ≈ 3,5 символа на токен. */
export function estimateTokens(chars: number): number {
  return Math.ceil(chars / 3.5);
}

/** Доля заполненности контекста модели (0..1). contextK = 0 — у модели нет текстового контекста. */
export function contextUsage(chars: number, contextK: number): number {
  if (contextK <= 0) return 0;
  return Math.min(1, estimateTokens(chars) / (contextK * 1000));
}
