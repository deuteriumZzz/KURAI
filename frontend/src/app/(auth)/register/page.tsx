"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/auth/field";
import { TelegramLogin } from "@/components/auth/telegram-login";
import { Button } from "@/components/ui/button";
import { Segments, useFx } from "@/components/fx/primitives";
import { emailError, passwordError, passwordScore, SCORE_LABEL } from "@/lib/auth-validate";

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
    await new Promise((r) => setTimeout(r, 500));
    router.push(`/verify?email=${encodeURIComponent(email.trim())}`);
  }

  return (
    <>
      <h1 className="font-display text-3xl font-light">Регистрация</h1>
      <p className="mt-2 text-[14px] text-ink2">5 бесплатных запросов сразу после подтверждения почты.</p>
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
              <span>Надёжность: {SCORE_LABEL[score]} · минимум 8 символов</span>
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
              className="mt-0.5 size-4 shrink-0 accent-(--color-acc)"
            />
            <span>
              Принимаю{" "}
              <Link href="/offer" className="text-acc hover:underline">
                оферту
              </Link>{" "}
              и даю согласие на обработку персональных данных по{" "}
              <Link href="/privacy" className="text-acc hover:underline">
                политике
              </Link>
            </span>
          </label>
          {errors.consent && (
            <p id="consent-err" role="alert" className="text-[12.5px] text-err">
              {errors.consent}
            </p>
          )}
        </div>
        <Button type="submit" variant="primary" size="lg" disabled={submitting} className="mt-1 w-full">
          {submitting ? "Создаём…" : "Создать аккаунт"}
        </Button>
      </form>
      <div className="my-5 flex items-center gap-3 text-[12px] text-ink3 before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">или</div>
      <TelegramLogin />
      <p className="mt-6 text-[14px] text-ink2">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-acc hover:underline">
          Войти
        </Link>
      </p>
    </>
  );
}
