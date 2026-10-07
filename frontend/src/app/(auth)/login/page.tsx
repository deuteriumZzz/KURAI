"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/auth/field";
import { TelegramLogin } from "@/components/auth/telegram-login";
import { Button } from "@/components/ui/button";
import { emailError, loginPasswordError } from "@/lib/auth-validate";
import { kuraiApi, KuraiApiError } from "@/lib/kurai-api";
import { useFx } from "@/components/fx/primitives";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [formRef, glitch] = useFx<HTMLFormElement>("fx-glitch");

  if (!kuraiApi) {
    return (
      <>
        <h1 className="font-display text-3xl font-light">Локальный просмотр</h1>
        <p className="mt-2 text-[14px] leading-6 text-ink2">
          Сервер аккаунтов не подключён, поэтому войти или создать учётную запись в этой сборке нельзя.
        </p>
        <Link href="/app" className="mt-7 block border border-line2 bg-s2 px-4 py-3 text-center text-[14px] font-medium text-ink transition-colors hover:bg-s3">
          Открыть интерфейсный просмотр
        </Link>
        <p className="mt-4 border-l border-acc pl-3 font-mono text-[11.5px] leading-5 text-ink3">
          АККАУНТ · НЕ ПОДКЛЮЧЁН<br />
          ДАННЫЕ ПРОСМОТРА · ЛОКАЛЬНЫЕ
        </p>
      </>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = { email: emailError(email), password: loginPasswordError(password) };
    setErrors(next);
    if (next.email || next.password) return glitch();
    setSubmitting(true);
    try {
      if (kuraiApi) await kuraiApi.login({ email: email.trim(), password });
      else {
        await new Promise((r) => setTimeout(r, 500));
        if (password === "wrongpass") throw new Error("Неверный email или пароль. Проверьте раскладку или восстановите пароль.");
      }
      try {
        // К3 — после входа кабинет один раз показывает короткую загрузку сеанса
        sessionStorage.setItem("kurai:boot", "1");
      } catch {}
      router.push("/app");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось войти. Попробуйте ещё раз.";
      // 65 — неверные данные показываются у поля пароля: оно качается, рамка краснеет, причина под ним
      const wrong = (error instanceof KuraiApiError && error.code === "invalid_credentials") || (!kuraiApi && password === "wrongpass");
      setErrors(wrong ? { password: message } : { form: message });
      glitch();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-light">Вход</h1>
      <p className="mt-2 text-[14px] text-ink2">С возвращением — продолжите с того же места.</p>
      <form ref={formRef} onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
        <Field id="email" label="Email" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <Field
          id="password"
          label="Пароль"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={
            <Link href="/reset" className="hover:text-ink">
              Забыли пароль?
            </Link>
          }
        />
        {errors.form && (
          <p role="alert" className="border border-err/45 bg-err-soft px-3 py-2 text-[13px] text-err">
            {errors.form}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" disabled={submitting} className="mt-1 w-full">
          {submitting ? "Проверяем…" : "Войти"}
        </Button>
      </form>
      <div className="my-5 flex items-center gap-3 text-[12px] text-ink3 before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">или</div>
      <TelegramLogin />
      <p className="mt-6 text-[14px] text-ink2">
        Ещё нет аккаунта?{" "}
        <Link href="/register" className="text-acc hover:underline">
          Создать
        </Link>
      </p>
    </>
  );
}
