const FAQ = [
  ["Как выбирается модель?", "Оставьте «Авто» — KURAI подберёт модель по задаче. Или выберите сами в каталоге: у каждой модели указаны назначение, размер контекста и цена. Какая модель ответила, видно в каждом сообщении."],
  ["Как формируется стоимость?", "Под полем ввода видна оценка в кредитах. На время работы эта сумма резервируется, а после ответа списывается фактическая цена."],
  ["Что если модель не ответила?", "Резерв возвращается на баланс, в журнале операций появляется запись о возврате. Запрос можно повторить той же или другой моделью."],
  ["Можно ли сменить режим посреди задачи?", "Да. Текст, research и слайды работают в одном чате, и модель видит предыдущие сообщения."],
  ["Можно ли делать картинки, видео и озвучку?", "Да: в каталоге десятки моделей для изображений, видео и озвучки, цена видна до отправки, готовые файлы сохраняются в медиатеке. Что работает прямо сейчас, видно на странице статуса."],
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <p className="k-index">K/03 · Вопросы</p>
      <h2 id="faq-title" className="k-tech mt-3 mb-8 text-[clamp(2rem,4.4vw,3.4rem)] leading-[1.05]">
        Частые вопросы
      </h2>
      <div className="flex max-w-3xl flex-col border-t border-line">
        {FAQ.map(([q, a]) => (
          <details key={q} className="fx-faq group border-b border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] hover:text-ink [&::-webkit-details-marker]:hidden">
              {q}
              <span aria-hidden="true" className="k-code text-acc transition-transform duration-(--dur-base) group-open:rotate-45">
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
