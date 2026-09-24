import type { Mode } from "@/types/api";

/** Свои иконки режимов: линии 1.5, квадратные концы, геометрия HUD. 16×16 по умолчанию. */
const PATHS: Record<Mode, React.ReactNode> = {
  // текст: строка ввода с кареткой
  text: (
    <>
      <path d="M2 4h12M2 8h8M2 12h5" />
      <path d="M12 10v4" className="stroke-acc" />
    </>
  ),
  // изображение: кадр с горизонтом и солнцем-квадратом
  image: (
    <>
      <path d="M2 3h12v10H2z" />
      <path d="M2 11l4-4 3 3 2-2 3 3" />
      <path d="M10.5 5h1.5v1.5h-1.5z" className="fill-current" />
    </>
  ),
  // видео: кадр плёнки с перфорацией
  video: (
    <>
      <path d="M2 3h12v10H2z" />
      <path d="M4.5 3v10M11.5 3v10" />
      <path d="M7 6.5l2.5 1.5L7 9.5z" className="fill-current" />
    </>
  ),
  // аудио: сегментная волна
  audio: <path d="M2 7v2M4.5 5v6M7 3v10M9.5 5.5v5M12 6.5v3M14 7.5v1" />,
  // research: прицел с узлами сети
  research: (
    <>
      <path d="M8 2v3M8 11v3M2 8h3M11 8h3" />
      <path d="M5.5 5.5h5v5h-5z" />
      <path d="M7.25 7.25h1.5v1.5h-1.5z" className="fill-current" />
    </>
  ),
  // слайды: экран со срезанным углом на стойке
  slides: (
    <>
      <path d="M2 2h9l3 3v6H2z" />
      <path d="M8 11v3M5 14h6M4.5 5h4M4.5 7.5h6" />
    </>
  ),
};

export function ModeIcon({ mode, size = 16, className }: { mode: Mode; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      className={className}
    >
      {PATHS[mode]}
    </svg>
  );
}
