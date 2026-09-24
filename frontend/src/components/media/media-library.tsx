"use client";

import { useEffect, useState } from "react";
import type { MediaItem } from "@/types/api";
import type { LightboxItem } from "@/lib/app-state";
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
export function MediaLibrary({ items, lightbox, visual }: { items: MediaItem[]; lightbox: LightboxItem[]; visual: MediaItem[] }) {
  const [favs, setFavs] = useState<string[]>([]);
  const [onlyFav, setOnlyFav] = useState(false);
  const [coll, setColl] = useState<string | null>(null);

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

  const chats = COLLECTIONS.find((c) => c.name === coll)?.chats;
  const shown = items.filter((it) => (!onlyFav || favs.includes(it.id)) && (!chats || chats.includes(it.chatId)));
  const byDay = shown.reduce<Record<string, MediaItem[]>>((acc, it) => {
    (acc[it.createdAt.slice(0, 10)] ??= []).push(it);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={onlyFav}
          onClick={() => setOnlyFav((v) => !v)}
          className={cn("border px-3 py-1.5 text-[13px]", onlyFav ? "border-acc-line bg-acc-soft text-acc" : "border-line text-ink2 hover:text-ink")}
        >
          ★ Избранное <span className="ml-1 font-mono text-[11px] text-ink3">{favs.length}</span>
        </button>
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
      </div>
      {shown.length === 0 && <p className="border border-dashed border-line2 px-4 py-10 text-center text-[13.5px] text-ink3">Здесь пусто — отметьте работы звёздочкой или выберите другую коллекцию.</p>}
      {Object.entries(byDay).map(([day, list]) => (
        <section key={day} aria-label={day} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-mono text-[11px] tracking-[0.12em] text-ink2 uppercase">
              {new Date(day).toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" })}
            </h2>
            <Label>{list.length} работ</Label>
          </div>
          <div className="fx-ruler" aria-hidden="true" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((item) => (
              <Appear key={item.id} index={items.indexOf(item)}>
                <MediaCard item={item} all={lightbox} index={visual.indexOf(item)} fav={favs.includes(item.id)} onFav={() => toggle(item.id)} />
              </Appear>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
