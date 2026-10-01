import Link from "next/link";

/** Password-reset email delivery is intentionally unavailable until its server flow exists. */
export default function ResetPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-light">Восстановление недоступно</h1>
      <p className="mt-2 text-[14px] leading-6 text-ink2">
        Почтовый контур восстановления пароля ещё не подключён. Мы не принимаем email, пока не можем отправить настоящее письмо для сброса.
      </p>
      <Link href="/login" className="mt-7 block border border-line2 bg-s2 px-4 py-3 text-center text-[14px] font-medium text-ink transition-colors hover:bg-s3">
        Вернуться ко входу
      </Link>
      <p className="mt-4 border-l border-acc pl-3 font-mono text-[11.5px] leading-5 text-ink3">
        EMAIL RESET · НЕ АКТИВИРОВАН
      </p>
    </>
  );
}
