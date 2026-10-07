"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Markdown } from "@/components/chat/markdown";
import { SiteHeader } from "@/components/landing/site-chrome";
import { ModelGlyph, glyphKind } from "@/components/brand/model-glyph";
import { modelByName, routeLabel } from "@/lib/models";
import { KuraiApiError, kuraiApi, type KuraiSharedChat } from "@/lib/kurai-api";

type SharedState =
  | { status: "loading" }
  | { status: "ready"; chat: KuraiSharedChat["chat"]; messages: KuraiSharedChat["messages"] }
  | { status: "missing" }
  | { status: "error" };

function SharedShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}

/**
 * Публичный снимок задачи только для чтения. Принимает лишь непрозрачный токен и показывает
 * поля публичного DTO: заголовок, роль, модель и текст — без имён, id и приватных ссылок.
 */
export function SharedChatClient({ token }: { token: string }) {
  const [state, setState] = useState<SharedState>(() => (kuraiApi ? { status: "loading" } : { status: "missing" }));

  useEffect(() => {
    if (!kuraiApi) return;
    let active = true;
    void kuraiApi
      .getSharedChat(token)
      .then(({ chat, messages }) => {
        if (active) setState({ status: "ready", chat, messages });
      })
      .catch((reason) => {
        // «отозвана/истекла» — только если сервер так и ответил; сбой сети — отдельное состояние
        const gone = reason instanceof KuraiApiError && [403, 404, 410].includes(reason.status);
        if (active) setState({ status: gone ? "missing" : "error" });
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (state.status === "loading") {
    return (
      <SharedShell>
        <div role="status" aria-label="Проверяем ссылку" className="flex flex-col gap-4">
          <div className="h-3 w-40 animate-pulse bg-s2" />
          <div className="h-10 w-3/4 animate-pulse bg-s2" />
          <div className="mt-6 h-24 animate-pulse bg-s1" />
        </div>
      </SharedShell>
    );
  }

  if (state.status === "error") {
    return (
      <SharedShell>
        <div role="alert" className="flex flex-1 flex-col justify-center gap-5">
          <p className="k-index text-err">Не удалось загрузить</p>
          <h1 className="text-[clamp(1.75rem,3vw,2.3rem)] font-light text-ink">Сервер не ответил</h1>
          <p className="max-w-md text-[15px] leading-relaxed text-ink2">Ссылка может быть действующей. Проверьте соединение и обновите страницу.</p>
        </div>
      </SharedShell>
    );
  }

  if (state.status === "missing") {
    return (
      <SharedShell>
        <div className="flex flex-1 flex-col justify-center gap-5">
          <p className="k-index text-warn">Ссылка недоступна</p>
          <h1 className="k-display text-[clamp(2.75rem,7vw,4.5rem)] text-ink">Этот результат больше не открыт</h1>
          <p className="max-w-md text-[15px] leading-relaxed text-ink2">Возможно, владелец отозвал ссылку или закончился срок её действия.</p>
          <Link href="/" className="w-max rounded-(--radius-sm) border border-line2 px-4 py-2.5 text-[14px] text-ink hover:bg-s2">
            Открыть KURAI
          </Link>
        </div>
      </SharedShell>
    );
  }

  return (
    <SharedShell>
      <header className="mb-10 border-b border-line pb-6">
        <p className="k-index mb-4">Общий результат · только чтение</p>
        <h1 className="text-[clamp(1.75rem,3vw,2.3rem)] leading-[1.15] font-light tracking-[-0.022em] text-balance text-ink">{state.chat.title}</h1>
      </header>
      <div className="flex flex-col gap-10">
        {state.messages.map((message, index) => {
          if (message.role === "user") {
            return (
              <section key={index} aria-label="Запрос" className="flex flex-col gap-1.5">
                <p className="k-index">Запрос</p>
                <p className="text-[15.5px] leading-[1.65] whitespace-pre-wrap text-ink">{message.text}</p>
              </section>
            );
          }
          const info = message.model ? modelByName(message.model) : undefined;
          return (
            <article key={index} className="flex flex-col gap-3">
              <p className="flex items-center gap-2.5 text-[14px] text-ink">
                <ModelGlyph id={info?.id ?? message.model ?? "auto"} kind={glyphKind(info?.group)} size={22} />
                {message.model ? routeLabel(message.model) : "Автомаршрут"}
              </p>
              {message.text.trim() ? <Markdown text={message.text} /> : <p className="text-[14px] text-ink3">Ответа нет — запуск остановили или он не завершился.</p>}
            </article>
          );
        })}
      </div>
      <aside className="mt-14 flex flex-col items-start gap-3 border-t border-line pt-8">
        <p className="text-[18px] font-light text-ink">Продолжите работу в KURAI</p>
        <p className="text-[14px] text-ink2">Текст, изображения и исследования — в одном рабочем пространстве, с ценой до запуска.</p>
        <Link href="/register" className="mt-1 rounded-(--radius-sm) bg-acc px-4 py-2.5 text-[14px] font-medium text-acc-ink">
          Попробовать KURAI
        </Link>
      </aside>
    </SharedShell>
  );
}
