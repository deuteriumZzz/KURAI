"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { kuraiApi, type TelegramWidgetUser } from "@/lib/kurai-api";
import { afterAuthHref } from "@/lib/landing-draft";

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

/**
 * Вход через Telegram Login Widget: кнопку и подтверждение показывает сам Telegram,
 * сервер проверяет подпись ключом бота. Пока бот не настроен, блока нет совсем — без «скоро».
 */
export function TelegramLogin() {
  const slot = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const api = kuraiApi;

  useEffect(() => {
    const el = slot.current;
    if (!BOT || !api || !el) return;
    const host = window as typeof window & { kuraiTelegramAuth?: (user: TelegramWidgetUser) => void };
    host.kuraiTelegramAuth = (user) => {
      setError(null);
      api.telegramLogin(user).then(
        () => router.push(afterAuthHref()),
        () => setError("Не удалось войти через Telegram. Попробуйте ещё раз."),
      );
    };
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.dataset.telegramLogin = BOT;
    script.dataset.size = "large";
    script.dataset.radius = "6";
    script.dataset.onauth = "kuraiTelegramAuth(user)";
    el.appendChild(script);
    return () => {
      delete host.kuraiTelegramAuth;
      el.replaceChildren();
    };
  }, [api, router]);

  if (!BOT || !api) return null;
  return (
    <>
      <div className="my-5 flex items-center gap-3 text-[12px] text-ink3 before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">или</div>
      <div ref={slot} className="flex min-h-10 justify-center" />
      {error && (
        <p role="alert" className="mt-3 border border-err/45 bg-err-soft px-3 py-2 text-[13px] text-err rounded-(--radius-md)">
          {error}
        </p>
      )}
    </>
  );
}
