"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, FileText, LoaderCircle } from "lucide-react";
import { Label } from "@/components/fx/primitives";
import { PageTitle } from "@/components/fx/page-title";
import { formatCredits } from "@/lib/format";
import { motion } from "motion/react";
import { SPRING } from "@/lib/motion";

const nowMs = () => Date.now();
const codeOf = (id: string) => {
  const hex = id.replace(/[^0-9a-f]/gi, "").slice(0, 8).toUpperCase();
  return `ART·${hex.slice(0, 4)}-${hex.slice(4)}`;
};
import { kuraiApi, type KuraiArtifact } from "@/lib/kurai-api";

const KIND: Record<KuraiArtifact["kind"], string> = {
  document: "Документ", specification: "Спецификация", table: "Таблица", recipe: "Рецепт", research_packet: "Пакет исследования",
};

/** Private library of saved answer snapshots, rather than a mirror of transient drafts. */
export default function ArtifactsPage() {
  const [state, setState] = useState<"loading" | "ready" | "offline" | "error">(kuraiApi ? "loading" : "offline");
  const [artifacts, setArtifacts] = useState<KuraiArtifact[]>([]);
  const [openedAt] = useState(nowMs);

  useEffect(() => {
    if (!kuraiApi) return;
    let active = true;
    void kuraiApi.artifacts().then(
      (items) => { if (active) { setArtifacts(items); setState("ready"); } },
      () => { if (active) setState("error"); },
    );
    return () => { active = false; };
  }, []);

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 pl-16 md:px-6 md:pl-6">
        <PageTitle title="Артефакты" />
        <Label>{state === "ready" ? `${artifacts.length} сохранено` : "приватная библиотека"}</Label>
      </header>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-7 md:px-6">
        <section className="max-w-2xl">
          <p className="text-[17px] text-ink">Ответ становится рабочим объектом, когда его нужно вернуть в контекст.</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink2">Каждый артефакт хранит срез ответа, модель, стоимость и ссылки — исходный чат остаётся доступен отдельно.</p>
        </section>
        {state === "loading" && <p className="flex items-center gap-2 text-[13px] text-ink3"><LoaderCircle size={14} className="animate-spin" /> Загружаю приватную библиотеку…</p>}
        {state === "offline" && <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5"><p className="max-w-xl text-[13.5px] leading-relaxed text-ink3">Офлайн-прототип не создаёт фиктивные сохранения. Подключите API, чтобы работать с личной библиотекой.</p><Link href="/app/c/r4k2" className="k-tool border border-line text-ink">Открыть пример задачи</Link></div>}
        {state === "error" && <p role="alert" className="border-l border-err pl-3 text-[13px] text-err">Не удалось получить артефакты. Проверьте подключение и обновите страницу.</p>}
        {state === "ready" && artifacts.length === 0 && <section className="border border-dashed border-line p-6 text-[13.5px] text-ink3">Пока ничего не сохранено. Откройте полезный ответ в чате и выберите «Сохранить как артефакт».</section>}
        {state === "ready" && artifacts.length > 0 && (
          <ol className="divide-y divide-line border-y border-line">
            {artifacts.map((artifact, index) => (
              // К20 — артефакт как осколок данных: код, срезанный ярлык, ссылка на ответ-источник; свежий «выпадает» в список
              <motion.li
                key={artifact.id}
                initial={openedAt - Date.parse(artifact.createdAt) < 120_000 ? { opacity: 0, y: -18, rotate: -1.5 } : false}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={SPRING.bouncy}
                className="group grid gap-4 py-5 md:grid-cols-[42px_minmax(0,1fr)_auto] md:items-start"
              >
                <span aria-hidden="true" className="grid size-9 place-items-center bg-s2 font-mono text-[11px] text-ink3">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h2 className="truncate text-[16px] text-ink">{artifact.title}</h2>
                    <span className="k-shard-tag font-mono text-[10.5px] tracking-[0.06em] text-violet uppercase">{KIND[artifact.kind]}</span>
                    <button type="button" onClick={() => void navigator.clipboard?.writeText(codeOf(artifact.id)).catch(() => undefined)} aria-label={`Скопировать код ${codeOf(artifact.id)}`} className="k-code inline-flex min-h-6 cursor-pointer items-center rounded-(--radius-xs) px-1 text-[11px] text-ink3 hover:bg-s2 hover:text-ink">
                      {codeOf(artifact.id)}
                    </button>
                  </div>
                  <p className="mt-2 line-clamp-3 max-w-2xl whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink2">{artifact.body}</p>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-ink3"><span>{artifact.provenance.model ?? "модель не указана"}</span><span>{formatCredits(artifact.provenance.costMicro)}</span>{artifact.provenance.sources.length > 0 && <span className="text-violet">источники: {artifact.provenance.sources.length}</span>}</div>
                </div>
                <div className="flex items-center gap-2 md:justify-end">
                  <Link href={`/app/c/${artifact.chatId}`} className="inline-flex h-9 items-center gap-1.5 bg-s2 px-2.5 text-[12px] text-ink2 transition-colors duration-(--dur-fast) hover:bg-s3 hover:text-ink"><FileText size={14} strokeWidth={1.5} /> Чат</Link>
                  <Link href={`/app?prompt=${encodeURIComponent(`Продолжи работу с артефактом «${artifact.title}»:\n${artifact.body.slice(0, 1400)}`)}`} className="inline-flex h-9 items-center gap-1.5 bg-acc px-2.5 text-[12px] text-acc-ink transition-transform duration-(--dur-fast) hover:-translate-y-px">Продолжить <ArrowUpRight size={14} strokeWidth={1.5} /></Link>
                </div>
              </motion.li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}
