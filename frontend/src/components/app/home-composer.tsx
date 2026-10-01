"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Mode } from "@/types/api";
import { MOCK_NOW } from "@/mocks/data";
import { kuraiApi } from "@/lib/kurai-api";
import { balanceStore, chatsStore } from "@/lib/app-state";
import { useStore } from "@/lib/store";
import { formatWhen } from "@/lib/format";
import { Composer } from "./composer";

export function HomeComposer({ mode, model, compare, prompt }: { mode?: Mode; model?: string; compare?: string[]; prompt?: string }) {
  // баланс ещё не пришёл — не блокируем отправку выдуманным нулём
  const balanceMicro = useStore(balanceStore)?.micro ?? Infinity;

  return <Composer key={`${mode}:${model}:${compare?.join(",")}:${prompt}`} variant="home" initialMode={mode} initialValue={prompt} initialModel={model} initialCompareModels={compare} balanceMicro={balanceMicro} />;
}

/** Недавняя работа — подчинённый модуль под полем: три последних задачи из реальной истории. */
export function RecentWork() {
  const chats = useStore(chatsStore);
  const recent = [...chats].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 3);
  const now = kuraiApi ? new Date() : MOCK_NOW;
  if (recent.length === 0) return null;
  return (
    <ul className="flex flex-col">
      {recent.map((c) => (
        <li key={c.id}>
          <Link href={`/app/c/${c.id}`} className="group flex items-center justify-between gap-4 border-t border-line py-3 text-left">
            <span className="min-w-0">
              <span className="block truncate text-[14px] text-ink2 group-hover:text-ink">{c.title}</span>
              <span className="block text-[12px] text-ink3">{formatWhen(c.updatedAt, now)}</span>
            </span>
            <ArrowUpRight size={15} strokeWidth={1.5} className="shrink-0 text-ink3 transition-transform duration-(--dur-fast) group-hover:translate-x-0.5 group-hover:text-ink" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
