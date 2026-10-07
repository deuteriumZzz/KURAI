"use client";

import { useEffect, useRef } from "react";
import { KeyHint, Label } from "@/components/fx/primitives";

const GROUPS: [string, [string, string][]][] = [
  ["Общее", [["⌘K / Ctrl+K", "Поиск и команды"], ["N", "Новый чат"], ["/", "Перейти в поле ввода"], ["Alt", "Показать клавиши на кнопках"], ["F", "Режим фокуса"], ["[", "Свернуть или развернуть левую панель"], ["?", "Эта шпаргалка"]]],
  ["Поле ввода", [["Enter", "Отправить"], ["Shift+Enter", "Новая строка"], ["/i /v /a /r /s /t", "Сменить режим"], ["↑", "Изменить последнее сообщение"], ["Esc", "Остановить ответ"]]],
  ["Чат и просмотр", [["J / K", "Следующий и предыдущий ответ"], ["C", "Копировать ответ"], ["R", "Новая версия ответа"], ["1–4", "Продолжение — в поле ввода"], ["1–3", "Выбрать вариант агента"], ["← →", "Листать картинки и слайды"], ["Esc", "Закрыть панель или просмотр"]]],
];

/** Шпаргалка горячих клавиш — нативный <dialog>: фокус внутри, Esc закрывает. */
export function Shortcuts({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label="Горячие клавиши"
      className="fx-dialog m-auto w-[min(640px,calc(100vw-32px))] border border-line2 bg-g1 p-0 text-ink"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <Label className="text-acc">Горячие клавиши</Label>
        <KeyHint>Esc</KeyHint>
      </div>
      <div className="grid gap-5 p-4 sm:grid-cols-2">
        {GROUPS.map(([g, rows]) => (
          <section key={g} className="flex flex-col gap-2">
            <Label>{g}</Label>
            <dl className="flex flex-col gap-1.5">
              {rows.map(([k, v]) => (
                <div key={k + v} className="flex items-center justify-between gap-3 text-[13px]">
                  <dt className="text-ink2">{v}</dt>
                  <dd>
                    <KeyHint>{k}</KeyHint>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </dialog>
  );
}
