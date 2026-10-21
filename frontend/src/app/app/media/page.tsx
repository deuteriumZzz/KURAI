"use client";

import { PageTitle } from "@/components/fx/page-title";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { MediaKind } from "@/types/api";
import type { MediaItem } from "@/types/api";
import { MediaLibrary } from "@/components/media/media-library";
import { Hatch, Label, Segments } from "@/components/fx/primitives";
import { EmptyState } from "@/components/fx/empty-state";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/cn";
import { MOCK_MEDIA, MOCK_STORAGE } from "@/mocks/data";
import { kuraiApi } from "@/lib/kurai-api";

const FILTERS: { kind: MediaKind | "all"; label: string }[] = [
  { kind: "all", label: "Все" },
  { kind: "image", label: "Изображения" },
  { kind: "video", label: "Видео" },
  { kind: "audio", label: "Аудио" },
];

const EMPTY: Record<MediaKind | "all", { title: string; hint: string; mode: string }> = {
  all: { title: "Здесь появятся ваши генерации", hint: "Попросите в чате картинку, видео или озвучку — результат сохранится сюда.", mode: "image" },
  image: { title: "Изображений пока нет", hint: "Переключите поле ввода в режим «Изображение» или напишите /i.", mode: "image" },
  video: { title: "Видео пока нет", hint: "Режим «Видео» или /v. Можно оживить картинку из чата.", mode: "video" },
  audio: { title: "Аудио пока нет", hint: "Режим «Аудио» или /a — озвучим текст или ответ модели.", mode: "audio" },
};

/** Медиатека: все результаты генераций из всех чатов. Генерация идёт в чате, здесь — просмотр и поиск. */
export default function MediaPage() {
  const searchParams = useSearchParams();
  const [liveItems, setLiveItems] = useState<MediaItem[] | null>(null);
  const [state, setState] = useState<"offline" | "loading" | "ready" | "failed">(kuraiApi ? "loading" : "offline");
  const kind = FILTERS.find((f) => f.kind === searchParams.get("kind"))?.kind ?? "all";

  useEffect(() => {
    if (!kuraiApi) return;
    void kuraiApi.media().then((assets) => {
      setLiveItems(assets.map((asset) => ({
        id: asset.id, kind: asset.kind, url: asset.url, chatId: asset.chatId, messageId: asset.messageId,
        prompt: asset.prompt, model: asset.model, costMicro: asset.costMicro, sizeBytes: asset.sizeBytes, createdAt: asset.createdAt,
      })));
      setState("ready");
    }).catch(() => setState("failed"));
  }, []);

  const source = useMemo(() => (state === "ready" ? (liveItems ?? []) : state === "offline" ? MOCK_MEDIA : []), [liveItems, state]);
  const items = useMemo(() => [...source]
    .filter((m) => kind === "all" || m.kind === kind)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [kind, source]);
  const usedBytes = source.reduce((total, item) => total + item.sizeBytes, 0);
  const quotaBytes = state === "offline" ? MOCK_STORAGE.quotaBytes : null;
  const used = quotaBytes ? usedBytes / quotaBytes : 0;
  const visual = items.filter((m) => m.kind !== "audio");
  const lightbox = visual.map((m) => ({ id: m.id, src: (m.kind === "video" ? m.poster : m.url) ?? "", alt: m.prompt, caption: `${m.model} · ${m.prompt}`, kind: m.kind === "video" ? ("video" as const) : ("image" as const), durationSec: m.durationSec }));
  const count = (k: MediaKind | "all") => (k === "all" ? source.length : source.filter((m) => m.kind === k).length);

  return (
    <main className="kurai-asset-page flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="kurai-asset-page__header flex h-14 shrink-0 items-center justify-between gap-3 bg-s1 px-4 pl-16 md:pl-6">
        <PageTitle title="Медиатека" />
        <Label>{state === "loading" ? "загружаем медиатеку" : state === "failed" ? "медиатека временно недоступна" : `${count("all")} работ из всех чатов`}</Label>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <nav aria-label="Фильтр по типу" className="kurai-asset-filters flex flex-wrap gap-1 bg-s1 p-1 rounded-(--radius-sm)">
            {FILTERS.map((f) => (
              <Link
                key={f.kind}
                href={f.kind === "all" ? "/app/media" : `/app/media?kind=${f.kind}`}
                aria-current={f.kind === kind ? "page" : undefined}
                className={cn(
                  "px-3.5 py-2 text-[13px] pointer-coarse:py-3 rounded-(--radius-xs)",
                  f.kind === kind ? "bg-s3 text-ink" : "text-ink2 hover:bg-s2 hover:text-ink",
                )}
              >
                {f.label} <span className="ml-1 font-mono text-[11px] text-ink3">{count(f.kind)}</span>
              </Link>
            ))}
          </nav>

          <div className="w-full max-w-72">
            <div className="mb-1.5 flex items-baseline justify-between text-[12.5px] text-ink2">
              Хранилище
              <span className="font-mono text-ink tabular-nums">
                {quotaBytes ? `${formatBytes(usedBytes)} / ${formatBytes(quotaBytes)}` : formatBytes(usedBytes)}
              </span>
            </div>
            {quotaBytes ? <Segments value={used} count={20} tone={used > 0.8 ? "warn" : "acc"} label="Заполненность хранилища" /> : <p className="text-[11px] text-ink3">Квота хранилища пока не задана.</p>}
          </div>
        </div>

        {quotaBytes && used > 0.9 && <Hatch>Хранилище почти заполнено — удалите старые работы или перейдите на тариф Ultra.</Hatch>}

        {items.length > 0 ? (
          <MediaLibrary items={items} lightbox={lightbox} visual={visual} showPrototypeCollections={state === "offline"} />
        ) : (
          <div className="rounded-(--radius-md) bg-s1">
            <EmptyState
              title={EMPTY[kind].title}
              hint={EMPTY[kind].hint}
              action={
                <Link href={`/app?mode=${EMPTY[kind].mode}`} className="mt-2 rounded-(--radius-sm) bg-acc px-4 py-2 text-[13px] font-medium text-acc-ink">
                  Создать в чате
                </Link>
              }
            />
          </div>
        )}
        {state === "offline" && <p className="text-[12px] text-ink3">Офлайн-прототип · примеры работ и коллекции не относятся к вашему аккаунту.</p>}
        {state === "failed" && <p role="status" className="bg-err-soft px-3 py-2 text-[13px] text-err rounded-(--radius-md)">Не удалось загрузить медиатеку. Повторите попытку позже.</p>}
      </div>
    </main>
  );
}
