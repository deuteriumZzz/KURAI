"use client";

import { startTransition, useEffect, useState } from "react";
import type { ChatSummary, Message } from "@/types/api";
import { kuraiApi } from "@/lib/kurai-api";
import { balanceStore, chatsStore } from "@/lib/app-state";
import { useStore } from "@/lib/store";
import { takeChat } from "@/lib/chat-cache";
import { ChatView } from "./chat-view";
import { PageSkeleton } from "@/components/fx/skeleton";

type Props = { chatId: string; fallback?: { chat: ChatSummary; messages: Message[] } };

/** Loads server-owned chat history when the workspace is connected to KURAI API. */
export function ChatLoader({ chatId, fallback }: Props) {
  // офлайн: чат, только что созданный с главной, есть лишь в локальной истории
  const [snapshot, setSnapshot] = useState(() => {
    const local = !kuraiApi && !fallback ? chatsStore.get().find((c) => c.id === chatId) : undefined;
    return fallback ?? (local ? { chat: local, messages: [] } : undefined);
  });
  const [error, setError] = useState<string | null>(null);
  const balanceMicro = useStore(balanceStore)?.micro ?? Infinity;

  useEffect(() => {
    if (!kuraiApi) return;
    let active = true;
    // 95 — если строку наводили, снимок уже загружен и чат открывается сразу
    void (takeChat(chatId) ?? kuraiApi.getChat(chatId))
      // переход, а не мгновенная подмена: поле ввода доезжает из заглушки в настоящий док (1)
      .then((next) => active && startTransition(() => setSnapshot(next)))
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "Не удалось открыть диалог."));
    return () => {
      active = false;
    };
  }, [chatId]);

  if (error) return <main className="grid flex-1 place-items-center p-6 text-center text-ink2"><p>{error}</p></main>;
  // 97 — заглушка повторяет форму документа; в ней же поле ввода, к которому переезжает поле с главной (1)
  if (!snapshot) return <PageSkeleton kind="chat" />;
  // A fallback can render before the authenticated snapshot arrives. Remounting
  // on its last message keeps ChatView's local branch state server-authoritative.
  return <ChatView key={`${snapshot.chat.id}:${snapshot.messages.at(-1)?.id ?? "empty"}`} chat={snapshot.chat} initial={snapshot.messages} balanceMicro={balanceMicro} live={!!kuraiApi} />;
}
