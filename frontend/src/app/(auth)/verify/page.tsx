import Link from "next/link";
import { Label, SysLine } from "@/components/fx/primitives";
import { ResendButton } from "@/components/auth/resend-button";

export default async function VerifyPage(props: PageProps<"/verify">) {
  const sp = await props.searchParams;
  const email = typeof sp.email === "string" ? sp.email : "вашу почту";
  return (
    <>
      <Label className="text-acc">Шаг 2 из 2</Label>
      <h1 className="mt-2 font-display text-3xl font-light">Подтвердите почту</h1>
      <p className="mt-3 text-[14px] text-ink2">
        Отправили ссылку на <span className="text-ink">{email}</span>. Откройте письмо и нажмите «Подтвердить» — после этого начислим 5
        бесплатных запросов.
      </p>
      <div className="mt-6 flex flex-col gap-2 border border-line bg-g1 p-4">
        <SysLine>письмо отправлено · ссылка действует 24 часа</SysLine>
        <SysLine>не пришло? проверьте «Спам» и «Промоакции»</SysLine>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <ResendButton />
        <Link href="/register" className="text-center text-[13px] text-ink2 hover:text-ink">
          Указать другой email
        </Link>
      </div>
    </>
  );
}
