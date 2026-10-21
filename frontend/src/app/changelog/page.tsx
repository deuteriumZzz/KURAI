import type { Metadata } from "next";
import { DocPage } from "@/components/site/doc-page";

export const metadata: Metadata = { title: "Что нового в KURAI", description: "Что изменилось в KURAI, по датам выпуска." };

const RELEASES = [
  { date: "21.10.2026", items: [["~", "новые шрифты; лендинг, вход и кабинет в одном стиле"], ["~", "тексты интерфейса стали короче и конкретнее"]] },
  { date: "08.10.2026", items: [["+", "восстановление пароля и подтверждение почты по письму"], ["+", "план исследования и ход работы видны в ответе"], ["~", "интерфейс проверен на телефонах, с клавиатуры и экранным диктором"]] },
  { date: "01.10.2026", items: [["+", "переименование, закрепление и архив чатов сохраняются на сервере"], ["~", "новый вид рабочего пространства"]] },
  { date: "24.09.2026", items: [["+", "каталог моделей и сравнение до трёх моделей"], ["+", "ветки и версии ответов"], ["+", "медиатека, артефакты и режим чтения"]] },
];

export default function ChangelogPage() {
  return (
    <DocPage eyebrow="Что нового" title="Обновления KURAI" lead="Что изменилось в KURAI, по датам выпуска.">
      <ol className="flex flex-col gap-6">
        {RELEASES.map((r) => (
          <li key={r.date} className="border-l border-acc-line pl-5">
            <p className="font-mono text-[13px] text-acc">
              {r.date}
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
