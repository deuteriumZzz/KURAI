import { PageTitle } from "@/components/fx/page-title";
import Link from "next/link";
import type { MediaKind } from "@/types/api";
import { MediaLibrary } from "@/components/media/media-library";
import { Hatch, Label, Segments } from "@/components/fx/primitives";
import { EmptyState } from "@/components/fx/empty-state";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/cn";
import { MOCK_MEDIA, MOCK_STORAGE } from "@/mocks/data";

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
export default async function MediaPage(props: PageProps<"/app/media">) {
  const sp = await props.searchParams;
  const kind = FILTERS.find((f) => f.kind === sp.kind)?.kind ?? "all";
  const items = [...MOCK_MEDIA]
    .filter((m) => kind === "all" || m.kind === kind)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const used = MOCK_STORAGE.usedBytes / MOCK_STORAGE.quotaBytes;
  const visual = items.filter((m) => m.kind !== "audio");
  const lightbox = visual.map((m) => ({ id: m.id, src: (m.kind === "video" ? m.poster : m.url) ?? "", alt: m.prompt, caption: `${m.model} · ${m.prompt}`, kind: m.kind === "video" ? ("video" as const) : ("image" as const), durationSec: m.durationSec }));
  const count = (k: MediaKind | "all") => (k === "all" ? MOCK_MEDIA.length : MOCK_MEDIA.filter((m) => m.kind === k).length);

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 pl-16 md:pl-6">
        <PageTitle title="Медиатека" code="SEC-02 // MEDIA" />
        <Label>{count("all")} работ из всех чатов</Label>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <nav aria-label="Фильтр по типу" className="flex flex-wrap border border-line">
            {FILTERS.map((f) => (
              <Link
                key={f.kind}
                href={f.kind === "all" ? "/app/media" : `/app/media?kind=${f.kind}`}
                aria-current={f.kind === kind ? "page" : undefined}
                className={cn(
                  "border-r border-line px-3.5 py-2 text-[13px] last:border-r-0 pointer-coarse:py-3",
                  f.kind === kind ? "bg-acc-soft text-acc" : "text-ink2 hover:text-ink",
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
                {formatBytes(MOCK_STORAGE.usedBytes)} / {formatBytes(MOCK_STORAGE.quotaBytes)}
              </span>
            </div>
            <Segments value={used} count={20} tone={used > 0.8 ? "warn" : "acc"} label="Заполненность хранилища" />
          </div>
        </div>

        {used > 0.9 && <Hatch>Хранилище почти заполнено — удалите старые работы или перейдите на тариф Ultra.</Hatch>}

        {items.length > 0 ? (
          <MediaLibrary items={items} lightbox={lightbox} visual={visual} />
        ) : (
          <div className="border border-dashed border-line2">
            <EmptyState
              title={EMPTY[kind].title}
              hint={EMPTY[kind].hint}
              action={
                <Link href={`/app?mode=${EMPTY[kind].mode}`} className="fx-chamfer fx-sheen mt-2 bg-acc px-4 py-2 text-[13px] font-semibold text-acc-ink [--ch:var(--chamfer-sm)]">
                  Создать в чате
                </Link>
              }
            />
          </div>
        )}
      </div>
    </main>
  );
}
