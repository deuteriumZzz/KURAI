"use client";

import { useEffect } from "react";

const BASE_TITLE = "KURAI — нейросети в одном чате";

function faviconWithDot(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#0D1218"/><path d="M22 14v36" stroke="#E4EEF7" stroke-width="6"/><path d="M44 14 28 32l16 18" fill="none" stroke="#00E8F0" stroke-width="6"/><rect x="42" y="2" width="20" height="20" fill="#00E8F0"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Вкладка браузера показывает реальную генерацию: «● Видео 44% — KURAI» и точку на иконке.
 * label = null — вернуть обычный вид.
 */
export function useTabStatus(label: string | null) {
  useEffect(() => {
    if (!label) return;
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const prevHref = link?.href;
    const prevTitle = document.title;
    document.title = `● ${label} — KURAI`;
    if (link) link.href = faviconWithDot();
    return () => {
      document.title = prevTitle.startsWith("●") ? BASE_TITLE : prevTitle;
      if (link && prevHref) link.href = prevHref;
    };
  }, [label]);
}
