"use client";

import { useSyncExternalStore } from "react";

/** Мини-хранилище без зависимостей: состояние + подписка для useSyncExternalStore. */
export function createStore<T>(initial: T) {
  let state = initial;
  const subs = new Set<() => void>();
  return {
    /** То, что видел серверный рендер: гидратация сверяется с ним, даже если данные успели прийти раньше. */
    initial: () => initial,
    get: () => state,
    set: (next: T | ((s: T) => T)) => {
      state = typeof next === "function" ? (next as (s: T) => T)(state) : next;
      subs.forEach((f) => f());
    },
    subscribe: (f: () => void) => {
      subs.add(f);
      return () => subs.delete(f);
    },
  };
}

export function useStore<T>(store: ReturnType<typeof createStore<T>>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.initial);
}
