"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** Приветствие по времени суток пользователя (на сервере часов не знаем — без него). */
export function Greeting({ name }: { name: string }) {
  const h = useSyncExternalStore(noop, () => new Date().getHours(), () => null);
  const hello = h === null ? "Здравствуйте" : h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер";
  return (
    <p className="-mt-2 text-[15px] text-ink3">
      {hello}, <span className="text-ink2">{name}</span>. Чем займёмся?
    </p>
  );
}
