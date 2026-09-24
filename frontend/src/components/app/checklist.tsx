"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { usePrefs } from "@/lib/use-prefs";
import { writePrefs } from "@/lib/prefs";
import { Label, Segments } from "@/components/fx/primitives";

const STEPS = [
  { id: "text", label: "Задать вопрос", href: "/app" },
  { id: "image", label: "Сделать картинку", href: "/app?mode=image" },
  { id: "video", label: "Оживить в видео", href: "/app?mode=video" },
  { id: "topup", label: "Пополнить баланс", href: "/app/billing#top-up" },
  { id: "share", label: "Поделиться чатом", href: "/app/c/7f3a" },
];

/** Чек-лист знакомства в сайдбаре: реальный прогресс, скрывается сам после 5/5 или вручную. */
export function Checklist() {
  const p = usePrefs();
  const done = STEPS.filter((s) => p.steps.includes(s.id)).length;
  if (p.checklistHidden || done === STEPS.length) return null;
  const next = STEPS.find((s) => !p.steps.includes(s.id));
  return (
    <div className="mx-2 mb-2 flex flex-col gap-2 border border-line bg-g2 p-2.5">
      <div className="flex items-center justify-between">
        <Label className="text-acc">Знакомство · {done} из {STEPS.length}</Label>
        <button type="button" onClick={() => writePrefs({ checklistHidden: true })} aria-label="Скрыть знакомство" className="grid size-6 cursor-pointer place-items-center text-ink3 hover:text-ink">
          <X size={12} strokeWidth={1.5} />
        </button>
      </div>
      <Segments value={done / STEPS.length} count={STEPS.length} label="Прогресс знакомства" />
      {next && (
        <Link href={next.href} className="text-[12.5px] text-ink2 hover:text-acc">
          › {next.label}
        </Link>
      )}
    </div>
  );
}
