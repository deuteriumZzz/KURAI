import { Scanline } from "@/components/fx/primitives";

/** Скелетон кабинета: сканирующая линия вместо спиннера. */
export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Загрузка" className="flex flex-1 flex-col">
      <div className="h-14 border-b border-line" />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 md:px-6">
        {[72, 88, 56, 80].map((w, i) => (
          <div key={i} className="relative h-4 overflow-hidden bg-g2" style={{ width: `${w}%` }}>
            <Scanline active />
          </div>
        ))}
      </div>
    </main>
  );
}
