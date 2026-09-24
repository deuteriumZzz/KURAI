import { ViewTransition } from "react";
import { cn } from "@/lib/cn";
import { Scanline } from "./primitives";

/** Скелетон-полоса со скан-линией вместо спиннера. */
export function Bar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div aria-hidden="true" style={style} className={cn("relative overflow-hidden bg-g2", className)}>
      <Scanline active />
    </div>
  );
}

export function PageSkeleton({ kind }: { kind: "grid" | "chat" | "list" }) {
  return (
    <main aria-busy="true" aria-label="Загрузка" className="flex flex-1 flex-col">
      <div className="flex h-14 items-center border-b border-line px-4 pl-16 md:pl-6">
        <Bar className="h-4 w-40" />
      </div>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 md:px-6">
        {kind === "grid" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Bar key={i} className="aspect-square" />
            ))}
          </div>
        )}
        {kind === "chat" &&
          [60, 85, 40, 90, 70].map((w, i) => <Bar key={i} className={cn("h-12", i % 2 ? "self-start" : "self-end")} style={{ width: `${w}%` }} />)}
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
        <div className="mt-auto flex justify-center border-t border-line px-4 pt-3 pb-4">
          <ViewTransition name="composer">
            <div className="fx-chamfer h-24 w-full max-w-3xl border border-line2 bg-g1 [--ch:var(--chamfer-lg)]" />
          </ViewTransition>
        </div>
      )}
    </main>
  );
}
