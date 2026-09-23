import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/chat/markdown";
import { Label } from "@/components/fx/primitives";
import { SiteHeader } from "@/components/landing/site-chrome";
import { branchOf } from "@/lib/tree";
import { MOCK_CHATS, MOCK_MESSAGES } from "@/mocks/data";

export async function generateMetadata(props: PageProps<"/s/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const chat = MOCK_CHATS.find((c) => c.id === id);
  return { title: chat ? `${chat.title} — чат в KURAI` : "Чат не найден — KURAI" };
}

/** Публичный чат по ссылке: только чтение и приглашение попробовать. */
export default async function SharedChat(props: PageProps<"/s/[id]">) {
  const { id } = await props.params;
  const chat = MOCK_CHATS.find((c) => c.id === id);
  if (!chat) notFound();
  const messages = branchOf(chat.headId, MOCK_MESSAGES).filter((m) => m.parts.some((p) => p.type === "text"));

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-2 border-b border-line pb-5">
          <Label className="text-acc">Публичный чат · только чтение</Label>
          <h1 className="font-display text-2xl font-light">{chat.title}</h1>
        </div>
        {messages.map((m) =>
          m.role === "user" ? (
            <p key={m.id} className="ml-auto max-w-[85%] border border-line bg-g2 px-3.5 py-2.5 text-[14.5px]">
              {m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
            </p>
          ) : (
            <div key={m.id} className="flex flex-col gap-2">
              {m.model && <span className="w-max border border-acc-line bg-acc-soft px-1.5 py-0.5 font-mono text-[11px] text-acc">{m.model}</span>}
              <Markdown text={m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")} />
            </div>
          ),
        )}
        <div className="fx-cut mt-4 flex flex-col items-start gap-3 border border-acc-line bg-g1 p-6">
          <p className="font-display text-xl font-light">Продолжите этот диалог в KURAI</p>
          <p className="text-[14px] text-ink2">Текст, картинки и видео в одном чате. 5 запросов бесплатно.</p>
          <Link href="/register" className="fx-chamfer bg-acc px-4 py-2.5 text-[14px] font-semibold text-acc-ink [--ch:var(--chamfer-sm)]">
            Попробовать KURAI
          </Link>
        </div>
      </main>
    </div>
  );
}
