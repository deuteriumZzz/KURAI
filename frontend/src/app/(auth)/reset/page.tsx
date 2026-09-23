"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/auth/field";
import { Button } from "@/components/ui/button";
import { SysLine, useFx } from "@/components/fx/primitives";
import { emailError } from "@/lib/auth-validate";

export default function ResetPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [formRef, glitch] = useFx<HTMLFormElement>("fx-glitch");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const err = emailError(email);
    setError(err);
    if (err) return glitch();
    setSent(true);
  }

  return (
    <>
      <h1 className="font-display text-3xl font-light">Восстановление пароля</h1>
      {sent ? (
        <div className="mt-6 flex flex-col gap-4">
          <SysLine tone="acc" decode>
            ссылка для сброса отправлена
          </SysLine>
          <p className="text-[14px] text-ink2">
            Если аккаунт с адресом <span className="text-ink">{email.trim()}</span> существует, письмо придёт в течение минуты.
          </p>
          <Link href="/login" className="text-[14px] text-acc hover:underline">
            ← Вернуться ко входу
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-[14px] text-ink2">Пришлём ссылку для нового пароля.</p>
          <form ref={formRef} onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
            <Field id="email" label="Email" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
            <Button type="submit" variant="primary" size="lg" className="w-full">
              Отправить ссылку
            </Button>
          </form>
          <Link href="/login" className="mt-6 text-[14px] text-ink2 hover:text-ink">
            ← Вернуться ко входу
          </Link>
        </>
      )}
    </>
  );
}
