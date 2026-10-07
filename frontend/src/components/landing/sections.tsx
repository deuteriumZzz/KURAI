import { Check, Minus } from "lucide-react";
import { Appear } from "@/components/fx/motion";
import { Label } from "@/components/fx/primitives";

const SCENARIOS = [
  { who: "Маркетолог", tasks: ["Контент-план на месяц", "Обложки в фирменном стиле", "Черновики кампаний"] },
  { who: "Предприниматель", tasks: ["Разбор рынка", "Структура питч-дека", "Письма клиентам без канцелярита"] },
  { who: "Студент", tasks: ["Конспект по PDF-лекции", "Объяснить тему простыми словами", "Проверить работу на ошибки"] },
  { who: "Разработчик", tasks: ["Ревью кода и тесты", "Схема архитектуры словами", "Документация из комментариев"] },
];

const COMPARE: [string, boolean | string, boolean | string][] = [
  ["Текст, research, изображения и слайды", true, "в разных сервисах"],
  ["Общий контекст между задачами", true, false],
  ["Цена запроса видна до отправки", true, false],
  ["Выбор модели в одном рабочем пространстве", true, "нужно переключаться"],
  ["Дерево диалогов и ветки", true, false],
  ["Понятный статус запуска", true, "зависит от сервиса"],
];

const FAQ = [
  ["Как выбирается модель?", "В каталоге доступны модели и их возможности. Вы выбираете конкретную модель для задачи, а KURAI сохраняет этот выбор и статус запуска в чате."],
  ["Как формируется стоимость?", "Перед отправкой создаётся оценка запроса. Система резервирует сумму на время запуска и фиксирует итог в журнале операций после завершения."],
  ["Что если запуск не завершился?", "Задача получает понятный финальный статус. Средства, не использованные для результата, не остаются в неясном состоянии — это отражается в журнале."],
  ["Можно ли продолжить работу в другом режиме?", "Да. Текст, research, изображения и слайды используют один контекст чата. Новый шаг всегда остаётся связан с тем, из которого он вырос."],
  ["Видео и аудио уже доступны?", "Они включаются по конфигурации: нужен серверный ключ OpenRouter и совместимые модели в живом каталоге. Текущий статус всегда показан на странице статуса."],
];

export function Scenarios() {
  return (
    <section aria-labelledby="sc-title" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <Label className="text-acc">Сценарии</Label>
      <h2 id="sc-title" className="mt-2 mb-8 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-normal">Под вашу работу</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SCENARIOS.map((s, i) => (
          <Appear inView index={i} key={s.who}>
            <article className="fx-hover h-full border border-line bg-g1 p-5 hover:border-line2">
              <p className="font-mono text-[11px] tracking-[0.12em] text-ink3 uppercase">0{i + 1}</p>
              <h3 className="mt-3 text-lg">{s.who}</h3>
              <ul className="mt-3 flex flex-col gap-2 text-[13.5px] text-ink2">
                {s.tasks.map((t) => (
                  <li key={t} className="before:mr-2 before:text-acc before:content-['›']">
                    {t}
                  </li>
                ))}
              </ul>
            </article>
          </Appear>
        ))}
      </div>
    </section>
  );
}

function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <Check size={16} strokeWidth={2} className="text-acc" aria-label="Да" />;
  if (v === false) return <Minus size={16} strokeWidth={1.5} className="text-ink3" aria-label="Нет" />;
  return <span>{v}</span>;
}

export function Compare() {
  return (
    <section aria-labelledby="cmp-title" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <Label className="text-acc">Сравнение</Label>
      <h2 id="cmp-title" className="mt-2 mb-8 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-normal">KURAI против трёх отдельных подписок</h2>
      {/* прокрутка вбок доступна и с клавиатуры: область получает фокус и имя */}
      <div tabIndex={0} role="region" aria-labelledby="cmp-title" className="overflow-x-auto border border-line">
        <table className="w-full min-w-[560px] border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-line bg-g1 text-left font-mono text-[11px] tracking-[0.1em] text-ink3 uppercase">
              <th className="px-4 py-3 font-medium">Что важно</th>
              <th className="px-4 py-3 font-medium text-acc">KURAI</th>
              <th className="px-4 py-3 font-medium">Отдельные подписки</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE.map(([k, a, b]) => (
              <tr key={k} className="border-b border-line last:border-b-0 hover:bg-g1">
                <td className="px-4 py-3 text-ink2">{k}</td>
                <td className="bg-acc-soft/40 px-4 py-3 text-ink">
                  <Cell v={a} />
                </td>
                <td className="px-4 py-3 text-ink3">
                  <Cell v={b} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12px] text-ink3">Стоимость отдельных подписок — ориентир для набора «текст + изображения + видео».</p>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-20 sm:px-6">
      <Label className="text-acc">Вопросы и ответы</Label>
      <h2 id="faq-title" className="mt-2 mb-8 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-normal">Коротко о главном</h2>
      <div className="flex flex-col border-t border-line">
        {FAQ.map(([q, a]) => (
          <details key={q} className="fx-faq group border-b border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] hover:text-acc [&::-webkit-details-marker]:hidden">
              {q}
              <span aria-hidden="true" className="font-mono text-acc transition-transform duration-(--dur-base) group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="pb-4 text-[14px] leading-relaxed text-ink2">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
