import { Decode } from "./decode";

/** Заголовок экрана кабинета: расшифровка при переходе + бирка раздела `SEC-02 // MEDIA`. */
export function PageTitle({ title, code }: { title: string; code: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <h1 className="font-display text-lg font-light">
        <Decode text={title} duration={320} />
      </h1>
      <span aria-hidden="true" className="hidden font-mono text-[10px] tracking-[0.16em] text-ink3 sm:inline">
        {code}
      </span>
    </div>
  );
}
