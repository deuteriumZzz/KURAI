import type { Metadata } from "next";
import { DocPage } from "@/components/site/doc-page";

export const metadata: Metadata = { title: "Что нового в KURAI", description: "Обновления продукта: новые модели, режимы и улучшения." };

const RELEASES = [
  { v: "v0.9.4", date: "23.09.2026", items: [["+", "режим «Аудио» в едином чате"], ["+", "резервные модели при сбое"], ["~", "стриминг быстрее на 30%"], ["✕", "исправлен баланс в Safari"]] },
  { v: "v0.9.3", date: "12.09.2026", items: [["+", "Deep Research с сетью источников"], ["+", "слайды в боковой панели"], ["~", "медиатека грузится в 2 раза быстрее"]] },
  { v: "v0.9.2", date: "01.09.2026", items: [["+", "вход через Telegram"], ["+", "калькулятор тарифов"], ["✕", "исправлены подсказки клавиш в Firefox"]] },
];

export default function ChangelogPage() {
  return (
    <DocPage eyebrow="Что нового" title="Обновления KURAI" lead="Выпускаем обновления каждую неделю. Крупные — анонсируем в Telegram-канале.">
      <ol className="flex flex-col gap-6">
        {RELEASES.map((r) => (
          <li key={r.v} className="border-l border-acc-line pl-5">
            <p className="font-mono text-[13px] text-acc">
              {r.v} <span className="text-ink3">· {r.date}</span>
            </p>
            <ul className="mt-2 flex flex-col gap-1 font-mono text-[13px] text-ink2">
              {r.items.map(([k, t]) => (
                <li key={t}>
                  <span className="mr-2 text-ink">{k}</span>
                  {t}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </DocPage>
  );
}
