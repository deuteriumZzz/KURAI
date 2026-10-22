"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/auth/field";
import { TelegramLogin } from "@/components/auth/telegram-login";
import { Button } from "@/components/ui/button";
import { Segments, useFx } from "@/components/fx/primitives";
import { emailError, passwordError, passwordScore, SCORE_LABEL } from "@/lib/auth-validate";
import { afterAuthHref } from "@/lib/landing-draft";
import { kuraiApi } from "@/lib/kurai-api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formRef, glitch] = useFx<HTMLFormElement>("fx-glitch");
  const score = passwordScore(password);

  if (!kuraiApi) {
    return (
      <>
        <h1 className="font-display text-4xl font-medium">Регистрация недоступна</h1>
        <p className="mt-2 text-[14px] leading-6 text-ink2">
          В этой локальной сборке не подключён сервер аккаунтов. Мы не принимаем данные формы, пока не можем создать реальный аккаунт.
        </p>
        <Link href="/app" className="mt-7 block border border-line2 bg-s2 px-4 py-3 text-center text-[14px] font-medium text-ink transition-colors hover:bg-s3 rounded-(--radius-sm)">
          Открыть интерфейсный просмотр
        </Link>
        <Link href="/login" className="mt-5 text-[14px] text-ink2 hover:text-ink">
          ← К экрану входа
        </Link>
      </>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = {
      name: name.trim() ? null : "Как к вам обращаться?",
      email: emailError(email),
      password: passwordError(password),
      consent: consent ? null : "Нужно согласие, чтобы создать аккаунт",
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return glitch();
    setSubmitting(true);
    try {
      if (kuraiApi) await kuraiApi.signUp({ email: email.trim(), password, displayName: name.trim() });
      else await new Promise((r) => setTimeout(r, 500));
      try {
        // К3 — после входа кабинет один раз показывает короткую загрузку сеанса
        sessionStorage.setItem("kurai:boot", "1");
      } catch {}
      router.push(afterAuthHref());
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "Не удалось создать аккаунт." });
      glitch();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-4xl font-medium">Регистрация</h1>
      <p className="mt-2 text-[14px] text-ink2">Создадим рабочий аккаунт после проверки данных.</p>
      <form ref={formRef} onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
        <Field id="name" label="Имя" autoComplete="name" autoFocus value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <Field
          id="password"
          label="Пароль"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={
            <span className="flex flex-col gap-1.5">
              <Segments value={score / 4} count={4} tone={score < 2 ? "warn" : "acc"} label="Надёжность пароля" />
              <span>Надёжность: {SCORE_LABEL[score]} · минимум 12 символов</span>
            </span>
          }
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="consent" className="flex cursor-pointer items-start gap-2.5 text-[13px] text-ink2">
            <input
              id="consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              aria-invalid={!!errors.consent}
              aria-describedby={errors.consent ? "consent-err" : undefined}
              className="mt-0.5 size-5 shrink-0 accent-(--color-acc)"
            />
            <span>
              Принимаю{" "}
              <Link href="/offer" className="text-acc underline underline-offset-2">
                оферту
              </Link>{" "}
              и ознакомился с{" "}
              <Link href="/privacy" className="text-acc underline underline-offset-2">
                политикой обработки персональных данных
              </Link>
            </span>
          </label>
        {errors.consent && (
            <p id="consent-err" role="alert" className="text-[12.5px] text-err">
              {errors.consent}
            </p>
        )}
        {errors.form && <p role="alert" className="border border-err/45 bg-err-soft px-3 py-2 text-[13px] text-err rounded-(--radius-md)">{errors.form}</p>}
        </div>
        <Button type="submit" variant="primary" size="lg" disabled={submitting} className="mt-1 w-full">
          {submitting ? "Создаём…" : "Создать аккаунт"}
        </Button>
      </form>
      <TelegramLogin />
      <p className="mt-6 text-[14px] text-ink2">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-acc underline underline-offset-2">
          Войти
        </Link>
      </p>
    </>
  );
}
