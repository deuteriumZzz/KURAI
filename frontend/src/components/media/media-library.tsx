"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Clapperboard, Download, Layers, Maximize2, RotateCcw, X } from "lucide-react";
import type { MediaItem } from "@/types/api";
import { projectsStore, type LightboxItem } from "@/lib/app-state";
import { useStore } from "@/lib/store";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { useCalm } from "@/lib/use-calm";
import { formatBytes, formatCredits, plural } from "@/lib/format";
import { Appear } from "@/components/fx/motion";
import { Label } from "@/components/fx/primitives";
import { cn } from "@/lib/cn";
import { MediaCard } from "./media-card";

const KEY = "kurai:media-fav";
/** Коллекции (тестовые): по чату, из которого пришли работы. На бэкенде — свои коллекции пользователя. */
const COLLECTIONS: { name: string; chats: string[] }[] = [
  { name: "Кофейня «Нейрон»", chats: ["c9e4"] },
  { name: "Reels", chats: ["b21c"] },
  { name: "Обложки", chats: ["7f3a"] },
];

/** Медиатека: лента по дням, избранное ★ и коллекции. */
export function MediaLibrary({ items, lightbox, visual, showPrototypeCollections = false }: { items: MediaItem[]; lightbox: LightboxItem[]; visual: MediaItem[]; showPrototypeCollections?: boolean }) {
  const [favs, setFavs] = useState<string[]>([]);
  const [onlyFav, setOnlyFav] = useState(false);
  const [coll, setColl] = useState<string | null>(null);
  const [detail, setDetail] = useState<MediaItem | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- избранное хранится в браузере до бэкенда
      setFavs(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]);
    } catch {}
  }, []);

  const toggle = (id: string) =>
    setFavs((f) => {
      const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

  const chats = showPrototypeCollections ? COLLECTIONS.find((c) => c.name === coll)?.chats : undefined;
  const shown = items.filter((it) => (!onlyFav || favs.includes(it.id)) && (!chats || chats.includes(it.chatId)));
  const byDay = shown.reduce<Record<string, MediaItem[]>>((acc, it) => {
    (acc[it.createdAt.slice(0, 10)] ??= []).push(it);
    return acc;
  }, {});

  return (
    <div className="kurai-asset-library flex flex-col gap-6">
      <div className="kurai-asset-library__controls flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={onlyFav}
          onClick={() => setOnlyFav((v) => !v)}
          className={cn("border px-3 py-1.5 text-[13px]", onlyFav ? "border-acc-line bg-acc-soft text-acc" : "border-line text-ink2 hover:text-ink")}
        >
          ★ Избранное <span className="ml-1 font-mono text-[11px] text-ink3">{favs.length}</span>
        </button>
        {showPrototypeCollections && (
          <>
            <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
            <Label>Коллекции</Label>
            {COLLECTIONS.map((c) => (
              <button
                key={c.name}
                type="button"
                aria-pressed={coll === c.name}
                onClick={() => setColl(coll === c.name ? null : c.name)}
                className={cn("border px-2.5 py-1 text-[12.5px]", coll === c.name ? "border-acc-line bg-acc-soft text-acc" : "border-line text-ink2 hover:text-ink")}
              >
                {c.name}
              </button>
            ))}
          </>
        )}
      </div>
      {shown.length === 0 && <p className="border border-dashed border-line2 px-4 py-10 text-center text-[13.5px] text-ink3 rounded-(--radius-md)">Здесь пусто — отметьте работы звёздочкой или выберите другую коллекцию.</p>}
      {Object.entries(byDay).map(([day, list]) => (
        <section key={day} aria-label={day} className="kurai-asset-day flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="k-index text-ink2">
              {new Date(day).toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" })}
            </h2>
            <Label>{plural(list.length, ["работа", "работы", "работ"])}</Label>
          </div>
          <div className="h-px bg-line" aria-hidden="true" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((item) => (
              <Appear key={item.id} index={items.indexOf(item)}>
                <MediaCard item={item} all={lightbox} index={visual.indexOf(item)} fav={favs.includes(item.id)} onFav={() => toggle(item.id)} onDetails={() => setDetail(item)} />
              </Appear>
            ))}
          </div>
        </section>
      ))}
      <AnimatePresence>{detail && <AssetDetails key={detail.id} item={detail} onClose={() => setDetail(null)} />}</AnimatePresence>
    </div>
  );
}

const MODE = { image: "image", video: "video", audio: "audio" } as const;
const KIND_LABEL = { image: "Изображение", video: "Видео", audio: "Аудио" } as const;

/** Панель записи: метаданные открываются по запросу, действия возвращают результат в работу. */
function AssetDetails({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const calm = useCalm();
  const root = useRef<HTMLDivElement>(null);
  const project = useStore(projectsStore).find((p) => p.chatIds.includes(item.chatId));
  useFocusTrap(true, root);
  const route = (mode: string, prompt: string) => `/app?mode=${mode}&prompt=${encodeURIComponent(prompt)}`;
  const actions: { label: string; href: string; icon: typeof Layers }[] = [
    { label: "Повторить запрос", href: route(MODE[item.kind], item.prompt), icon: RotateCcw },
    ...(item.kind === "image"
      ? [
          { label: "Ещё варианты", href: route("image", `Ещё варианты: ${item.prompt}`), icon: Layers },
          { label: "Запросить версию в 4K", href: route("image", `Увеличь до 4K: ${item.prompt}`), icon: Maximize2 },
          { label: "Оживить в видео", href: route("video", `Оживи: ${item.prompt}`), icon: Clapperboard },
        ]
      : []),
  ];
  const file = item.url;
  return (
    <div ref={root} className="fixed inset-0 z-(--z-overlay)" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <motion.div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-bg/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={`Запись: ${KIND_LABEL[item.kind]}`}
        initial={calm ? { opacity: 0 } : { transform: "translateX(100%)" }}
        animate={calm ? { opacity: 1 } : { transform: "translateX(0%)" }}
        exit={calm ? { opacity: 0 } : { transform: "translateX(100%)", transition: { duration: 0.18 } }}
        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        className="k-inspector absolute inset-y-0 right-0 flex w-[min(400px,100vw)] flex-col overflow-y-auto shadow-(--shadow-float)"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
          <span className="text-[14px] text-ink">{KIND_LABEL[item.kind]}</span>
          <button type="button" onClick={onClose} aria-label="Закрыть" className="k-act"><X size={16} strokeWidth={1.5} /></button>
        </div>
        {item.kind !== "audio" && (item.kind === "video" ? item.poster : item.url) && (
          // eslint-disable-next-line @next/next/no-img-element -- локальное превью
          <img src={item.kind === "video" ? item.poster : item.url} alt={item.prompt} className="aspect-square w-full border-b border-line object-cover" />
        )}
        <section className="k-module p-5">
          <p className="k-index mb-2 text-signal">Промпт</p>
          <p className="text-[14px] leading-relaxed text-ink">{item.prompt}</p>
        </section>
        <section className="k-module p-5">
          <dl className="flex flex-col gap-2.5 text-[13px]">
            {([
              ["Модель", item.model],
              ["Стоимость", formatCredits(item.costMicro)],
              ["Размер", formatBytes(item.sizeBytes)],
              ...(item.durationSec ? [["Длительность", `${item.durationSec} с`]] : []),
              ["Создано", new Date(item.createdAt).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })],
              ...(project ? [["Проект", project.name]] : []),
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4">
                <dt className="text-ink3">{k}</dt>
                <dd className="text-right font-mono text-[12.5px] text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="k-module flex flex-col gap-1 p-5">
          {actions.map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href} className="k-tool justify-start">
              <Icon size={15} strokeWidth={1.5} className="text-ink3" /> {label}
            </Link>
          ))}
          {file && (
            <a href={file} download className="k-tool justify-start">
              <Download size={15} strokeWidth={1.5} className="text-ink3" /> Скачать файл
            </a>
          )}
        </section>
        <div className="mt-auto border-t border-line p-5">
          <Link href={`/app/c/${item.chatId}#msg-${item.messageId}`} className="k-tool w-full justify-center border border-line text-ink">
            Открыть исходную задачу
          </Link>
        </div>
      </motion.aside>
    </div>
  );
}
