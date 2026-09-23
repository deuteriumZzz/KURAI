"use client";

import { usePathname } from "next/navigation";

/** Тонкая cyan-полоса при смене страницы: ключ — путь, анимация проигрывается заново на каждом переходе. */
export function NavProgress() {
  const pathname = usePathname();
  return <span key={pathname} aria-hidden="true" className="fx-navbar" />;
}
