import Link from "next/link";
import { SignalLost } from "@/components/site/signal-lost";

export default function NotFound() {
  return (
    <SignalLost
      code="404"
      text="Такой страницы нет — возможно, ссылка устарела или чат удалён."
      action={
        <Link href="/app" className="fx-chamfer bg-acc px-4 py-2.5 text-[14px] font-semibold text-acc-ink [--ch:var(--chamfer-sm)]">
          Открыть кабинет
        </Link>
      }
    />
  );
}
