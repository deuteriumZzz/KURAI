import { ViewTransition } from "./view-transition";
import { cn } from "@/lib/cn";

/** Скелетон-полоса: общий для всего экрана блик (все заглушки бликуют в одной фазе), без спиннера. */
export function Bar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden="true" style={style} className={cn("k-shimmer relative overflow-hidden", className)} />;
}

export function PageSkeleton({ kind }: { kind: "grid" | "chat" | "list" }) {
  const page = (
    <main aria-busy="true" aria-label="Загрузка" className="flex flex-1 flex-col">
      <div className={cn("flex h-14 items-center px-4 pl-16 md:pl-6", kind !== "chat" && "border-b border-line")}>
        <Bar className="h-4 w-40" />
      </div>
      {/* у чата — те же контейнеры, что у документа (поля внутри колонки), у остальных — общая сетка */}
      <div className={kind === "chat" ? "flex-1" : "mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 md:px-6"}>
        {kind === "grid" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Bar key={i} className="aspect-square" />
            ))}
          </div>
        )}
        {/* 97 — заглушка повторяет документ: заголовок, мета, вопрос, ответ с квитанцией — ничего не сдвигается при загрузке */}
        {kind === "chat" && (
          <div className="mx-auto w-full max-w-[calc(var(--read-width,42rem)+3.25rem)] px-4 pt-6 pb-12 md:px-8 md:pt-9">
            <div className="mb-10 md:pl-[52px]">
              <Bar className="h-9 w-[70%] rounded-(--radius-sm)" />
              <Bar className="mt-4 h-3 w-48 rounded-full" />
            </div>
            <div className="grid gap-x-4 sm:grid-cols-[36px_minmax(0,1fr)]">
              <Bar className="size-9 rounded-full max-sm:hidden" />
              <div className="flex flex-col gap-2.5 pt-2.5">
                <Bar className="h-3 w-32 rounded-full" />
                <Bar className="h-3 w-[64%] rounded-full" />
              </div>
            </div>
            <div className="mt-11 grid gap-x-4 sm:grid-cols-[36px_minmax(0,1fr)]">
              <Bar className="size-9 rounded-full max-sm:hidden" />
              <div className="flex flex-col gap-2.5 pt-2.5">
                <Bar className="h-3 w-40 rounded-full" />
                {[96, 92, 88, 72].map((w) => (
                  <Bar key={w} className="h-3 rounded-full" style={{ width: `${w}%` }} />
                ))}
                <Bar className="mt-3 h-3 w-56 rounded-full" />
              </div>
            </div>
          </div>
        )}
        {kind === "list" && (
          <>
            <Bar className="h-40" />
            {Array.from({ length: 6 }, (_, i) => (
              <Bar key={i} className="h-10" />
            ))}
          </>
        )}
      </div>
      {kind === "chat" && (
        <div className="shrink-0 px-3 pt-1 pb-[max(0.9rem,env(safe-area-inset-bottom))] md:px-8">
          <div className="mx-auto w-full max-w-[60rem]">
            <ViewTransition name="composer" share="k-morph" default="none">
              <div className="h-24 w-full rounded-(--radius-lg) border border-line bg-g1" />
            </ViewTransition>
          </div>
        </div>
      )}
    </main>
  );
  // 97 — у чата справа место под панель контекста (как у документа), иначе колонка съезжает при загрузке
  return kind === "chat" ? (
    <div className="flex min-h-0 flex-1">
      {page}
      <aside aria-hidden="true" className="k-inspector hidden w-[340px] shrink-0 xl:block" />
    </div>
  ) : (
    page
  );
}
