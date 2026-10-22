"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Shot = { src: string; width: number; height: number; alt: string; pin: { x: number; y: number; side?: "left"; text: string }; max: string };

/** Шаги — по экранам кабинета. Картинки — снимки интерфейса, ответ в них иллюстрация, а не результат модели. */
const STEPS: { title: string; text: string; shot: Shot }[] = [
  {
    title: "Напишите задачу",
    text: "Обычными словами. Приложите файл или включите веб-поиск, если нужно. Рядом с кнопкой сразу видно, сколько кредитов уйдёт на ответ.",
    shot: { src: "/landing/composer.jpg", width: 1888, height: 546, alt: "Поле ввода: оценка в кредитах рядом с кнопкой отправки", pin: { x: 73.6, y: 61, side: "left", text: "Цена до отправки" }, max: "920px" },
  },
  {
    title: "Модель — сами или «Авто»",
    text: "В режиме «Авто» KURAI выбирает модель под запрос. Можно выбрать и вручную: у каждой модели указана цена типового запроса.",
    shot: { src: "/landing/picker.jpg", width: 1796, height: 1020, alt: "Выбор модели: «Авто» и список моделей с ценами", pin: { x: 60.3, y: 79.2, text: "Цена у каждой модели" }, max: "920px" },
  },
  {
    title: "Под ответом — модель и цена",
    text: "Видно, кто ответил и сколько это стоило. Все списания собраны в истории. Не понравился ответ — повторите той же или другой моделью.",
    shot: { src: "/landing/answer.jpg", width: 1100, height: 516, alt: "Ответ с подписью: какая модель ответила и сколько кредитов списано", pin: { x: 51.5, y: 77, text: "Модель и списание" }, max: "780px" },
  },
  {
    title: "Чаты и проекты под рукой",
    text: "Разговоры сохраняются в боковой панели. Похожие можно собрать в проект и вернуться к ним позже.",
    shot: { src: "/landing/rail.jpg", width: 393, height: 1100, alt: "Боковая панель: проекты и список чатов", pin: { x: 88, y: 72, text: "История сохраняется" }, max: "245px" },
  },
];

/**
 * «Как это работает»: слева шаги, справа закреплённое окно со снимком кабинета.
 * Шаг в середине экрана выбирает снимок; на телефоне снимки идут под текстом шага.
 */
export function ProductTour() {
  const [on, setOn] = useState(0);
  const steps = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setOn(Number((e.target as HTMLElement).dataset.i))),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    steps.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="how" aria-labelledby="how-title" className="mx-auto w-full max-w-[84rem] scroll-mt-20 px-4 py-20 sm:px-6">
      <p className="k-index">K/01 · Как это работает</p>
      <h2 id="how-title" className="k-tech mt-3 max-w-[22ch] text-[clamp(2rem,4.4vw,3.4rem)] leading-[1.05] text-balance">
        Всё видно до того, как вы нажмёте «Отправить»
      </h2>
      <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] md:gap-14">
        <ol className="relative border-l border-line pl-7">
          {/* линия прогресса: заполняется до текущего шага */}
          <span aria-hidden="true" className="absolute top-0 -left-px w-px bg-acc shadow-[0_0_12px_var(--color-acc)] transition-[height] duration-700" style={{ height: `${((on + 1) / STEPS.length) * 100}%` }} />
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              ref={(el) => {
                steps.current[i] = el;
              }}
              data-i={i}
              className={`flex flex-col justify-center py-7 transition-opacity duration-500 md:min-h-[52vh] md:py-0 ${i === on ? "" : "md:opacity-35"}`}
            >
              <span className="k-display text-[15px] text-acc">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="k-tech mt-3 text-[clamp(1.4rem,2.4vw,1.9rem)] leading-tight">{s.title}</h3>
              <p className="mt-3 max-w-[30rem] text-[15px] leading-relaxed text-ink2">{s.text}</p>
              {i < STEPS.length - 1 && (
                <div className="k-window mt-6 md:hidden">
                  <Image src={s.shot.src} width={s.shot.width} height={s.shot.height} alt={s.shot.alt} sizes="100vw" className="h-auto w-full rounded-[11px]" />
                </div>
              )}
            </li>
          ))}
        </ol>
        <div aria-hidden="true" className="sticky top-[12vh] hidden h-[76vh] md:block">
          <div className="k-tour-glow" />
          {STEPS.map((s, i) => (
            <div key={s.title} className="k-shot" data-on={i === on || undefined}>
              <div className="k-window" style={{ width: `min(100%, ${s.shot.max})` }}>
                <Image src={s.shot.src} width={s.shot.width} height={s.shot.height} alt="" sizes="(min-width: 1344px) 900px, 66vw" className="h-auto w-full rounded-[11px]" />
                <span className="k-pin" data-side={s.shot.pin.side} style={{ left: `${s.shot.pin.x}%`, top: `${s.shot.pin.y}%` }}>
                  <i />
                  <b>{s.shot.pin.text}</b>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
