"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Field } from "@/components/auth/field";
import { Button } from "@/components/ui/button";
import { emailError, passwordError } from "@/lib/auth-validate";
import { kuraiApi, KuraiApiError } from "@/lib/kurai-api";

const BACK = (
  <Link href="/login" className="mt-7 block border border-line2 bg-s2 px-4 py-3 text-center text-[14px] font-medium text-ink transition-colors hover:bg-s3">
    Вернуться ко входу
  </Link>
);

function Screen({ title, children, tag }: { title: string; children: ReactNode; tag?: string }) {
  return (
    <>
      <h1 className="font-display text-3xl font-light">{title}</h1>
      <div className="mt-2 text-[14px] leading-6 text-ink2">{children}</div>
      {tag && <p className="mt-4 border-l border-acc pl-3 font-mono text-[11.5px] leading-5 text-ink3">{tag}</p>}
    </>
  );
}

const Unavailable = () => (
  <Screen title="Восстановление недоступно" tag="ПОЧТА · НЕ ПОДКЛЮЧЕНА">
    <p>На этом сервере ещё не подключена отправка писем. Мы не принимаем email, пока не можем отправить настоящее письмо для сброса.</p>
    {BACK}
  </Screen>
);

const reason = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

/** Сброс пароля: без ссылки — запрос письма, со ссылкой из письма — новый пароль. */
export function ResetFlow({ uid, token }: { uid?: string; token?: string }) {
  const withLink = Boolean(uid && token);
  const [phase, setPhase] = useState<"form" | "sent" | "done" | "unavailable" | "expired">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // почта не подключена — форму запроса даже не показываем (по ссылке из письма сменить пароль можно и так)
  useEffect(() => {
    if (!kuraiApi || withLink) return;
    void kuraiApi
      .serviceStatus()
      .then((s) => s.reasons.includes("mail_unconfigured") && setPhase("unavailable"))
      .catch(() => undefined);
  }, [withLink]);

  if (!kuraiApi || phase === "unavailable") return <Unavailable />;

  if (phase === "sent")
    return (
      <Screen title="Проверьте почту" tag="ССЫЛКА · ОДНОРАЗОВАЯ · СРОК — В ПИСЬМЕ">
        <p>Если адрес {email.trim()} зарегистрирован, письмо со ссылкой для сброса уже в пути. Не пришло за несколько минут — проверьте «Спам» или запросите ещё раз.</p>
        {BACK}
      </Screen>
    );

  if (phase === "done")
    return (
      <Screen title="Пароль изменён">
        <p>Войдите с новым паролем. Другие открытые сеансы закрыты — там понадобится войти заново.</p>
        {BACK}
      </Screen>
    );

  if (phase === "expired")
    return (
      <Screen title="Ссылка устарела">
        <p>{error}</p>
        <Link href="/reset" className="mt-7 block border border-line2 bg-s2 px-4 py-3 text-center text-[14px] font-medium text-ink transition-colors hover:bg-s3">
          Запросить новую ссылку
        </Link>
      </Screen>
    );

  async function submit(e: FormEvent) {
    e.preventDefault();
    const api = kuraiApi;
    if (!api) return;
    const invalid = withLink ? passwordError(password) : emailError(email);
    setError(invalid);
    if (invalid) return;
    setBusy(true);
    try {
      if (withLink) {
        await api.confirmPasswordReset({ uid: uid!, token: token!, password });
        setPhase("done");
      } else {
        await api.requestPasswordReset(email.trim());
        setPhase("sent");
      }
    } catch (failure) {
      if (failure instanceof KuraiApiError && failure.code === "mail_unavailable") return setPhase("unavailable");
      const message = reason(failure, "Не удалось выполнить запрос. Попробуйте ещё раз.");
      if (failure instanceof KuraiApiError && failure.code === "reset_link_invalid") {
        setError(message);
        return setPhase("expired");
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-light">{withLink ? "Новый пароль" : "Восстановление пароля"}</h1>
      <p className="mt-2 text-[14px] text-ink2">{withLink ? "Придумайте новый пароль — от 12 символов." : "Пришлём на почту ссылку, по которой можно задать новый пароль."}</p>
      <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-4">
        {withLink ? (
          <Field id="password" label="Новый пароль" type="password" autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
        ) : (
          <Field id="email" label="Email" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
        )}
        <Button type="submit" variant="primary" size="lg" disabled={busy} className="mt-1 w-full">
          {busy ? "Отправляем…" : withLink ? "Сохранить пароль" : "Отправить ссылку"}
        </Button>
      </form>
      <Link href="/login" className="mt-5 block text-center text-[13px] text-ink2 hover:text-ink">
        Вспомнили пароль? Войти
      </Link>
    </>
  );
}

/** Повторная отправка письма подтверждения — только для вошедшего участника. */
function Resend() {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "login" | "error">("idle");
  const [message, setMessage] = useState("");
  if (state === "sent") return <p className="mt-6 text-[13.5px] text-ok">Письмо отправлено — откройте ссылку из него.</p>;
  if (state === "login")
    return (
      <p className="mt-6 text-[13.5px] text-ink2">
        Чтобы отправить письмо ещё раз, <Link href="/login" className="text-ink underline underline-offset-2">войдите в аккаунт</Link>.
      </p>
    );
  return (
    <>
      <Button
        variant="secondary"
        size="lg"
        className="mt-7 w-full"
        disabled={state === "busy"}
        onClick={async () => {
          const api = kuraiApi;
          if (!api) return;
          setState("busy");
          try {
            await api.resendVerification();
            setState("sent");
          } catch (failure) {
            if (failure instanceof KuraiApiError && failure.status === 401) return setState("login");
            setMessage(reason(failure, "Не удалось отправить письмо."));
            setState("error");
          }
        }}
      >
        {state === "busy" ? "Отправляем…" : "Отправить письмо ещё раз"}
      </Button>
      {state === "error" && <p role="alert" className="mt-3 text-[13px] text-err">{message}</p>}
    </>
  );
}

/** Подтверждение почты по ссылке из письма; без ссылки — объяснение и повторная отправка. */
export function VerifyFlow({ token }: { token?: string }) {
  const [phase, setPhase] = useState<"checking" | "done" | "invalid">("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    const api = kuraiApi;
    if (!api || !token) return;
    // повторный вызов безопасен: сервер подтверждает адрес идемпотентно
    void api.verifyEmail(token).then(
      () => setPhase("done"),
      (failure) => {
        setError(reason(failure, "Ссылка устарела."));
        setPhase("invalid");
      },
    );
  }, [token]);

  if (!kuraiApi)
    return (
      <Screen title="Подтверждение почты не настроено">
        <p>В локальном просмотре сервер аккаунтов не подключён — письма не отправляются.</p>
        {BACK}
      </Screen>
    );
  if (!token)
    return (
      <Screen title="Подтвердите почту">
        <p>Мы отправили письмо со ссылкой на адрес, указанный при регистрации. Откройте её — и адрес будет подтверждён.</p>
        <Resend />
      </Screen>
    );
  if (phase === "checking") return <Screen title="Проверяем ссылку…"><p>Секунду.</p></Screen>;
  if (phase === "done")
    return (
      <Screen title="Адрес подтверждён" tag="EMAIL · ПОДТВЕРЖДЁН">
        <p>Теперь на эту почту можно восстановить пароль и получать письма о важных событиях.</p>
        <Link href="/app" className="mt-7 block bg-acc px-4 py-3 text-center text-[14px] font-semibold text-acc-ink">
          Открыть кабинет
        </Link>
      </Screen>
    );
  return (
    <Screen title="Ссылка устарела">
      <p>{error}</p>
      <Resend />
    </Screen>
  );
}
