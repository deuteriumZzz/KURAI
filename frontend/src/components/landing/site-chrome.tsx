import Link from "next/link";
import { KuraiLogo } from "@/components/brand/mark";
import { MobileMenu } from "./mobile-menu";

/** Шапка и подвал публичных страниц (лендинг, тарифы, документы). */
export function SiteHeader() {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
      <Link href="/" aria-label="KURAI — на главную">
        <KuraiLogo />
      </Link>
      <nav aria-label="Основное" className="flex items-center gap-5 text-[13.5px] text-ink2">
        <Link href="/#models" className="hidden hover:text-ink sm:inline">Модели</Link>
        <Link href="/#faq" className="hidden hover:text-ink md:inline">Вопросы</Link>
        <Link href="/pricing" className="hidden hover:text-ink sm:inline">Тарифы</Link>
        <Link href="/login" className="hidden hover:text-ink sm:inline">Войти</Link>
        <Link href="/register" className="fx-chamfer fx-sheen bg-acc px-3.5 py-2 text-[13px] font-semibold text-acc-ink [--ch:var(--chamfer-sm)]">
          Начать
        </Link>
        <MobileMenu />
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-[12.5px] text-ink3 sm:px-6">
        <span className="font-mono tracking-[0.1em]">© 2026 KURAI</span>
        <nav aria-label="Документы" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/status" className="hover:text-ink">Статус</Link>
          <Link href="/changelog" className="hover:text-ink">Что нового</Link>
          <Link href="/privacy" className="hover:text-ink">Конфиденциальность</Link>
          <Link href="/terms" className="hover:text-ink">Условия</Link>
          <Link href="/offer" className="hover:text-ink">Оферта</Link>
        </nav>
      </div>
    </footer>
  );
}
