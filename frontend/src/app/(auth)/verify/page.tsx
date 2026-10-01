import Link from "next/link";

export default async function VerifyPage(props: PageProps<"/verify">) {
  await props.searchParams;
  return (
    <>
      <h1 className="font-display text-3xl font-light">Подтверждение почты не настроено</h1>
      <p className="mt-3 text-[14px] leading-6 text-ink2">
        Текущий вход использует защищённую сессию после регистрации. Письма с подтверждением и повторная отправка не включены, пока не появится серверный почтовый контур.
      </p>
      <Link href="/login" className="mt-7 block border border-line2 bg-s2 px-4 py-3 text-center text-[14px] font-medium text-ink transition-colors hover:bg-s3">К экрану входа</Link>
    </>
  );
}
