import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";

/** Страница-документ: статус, список изменений, юридические тексты. */
export function DocPage({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-4">
          <p className="k-index">{eyebrow}</p>
          <h1 className="k-display text-[clamp(2.8rem,6vw,4.6rem)] text-balance text-ink">{title}</h1>
          {lead && <p className="max-w-[62ch] text-ink2">{lead}</p>}
        </div>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
