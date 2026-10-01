"use client";

import { useEffect, useState } from "react";
import type { ChatSummary, Message } from "@/types/api";
import { kuraiApi } from "@/lib/kurai-api";
import { balanceStore } from "@/lib/app-state";
import { useStore } from "@/lib/store";
import { ChatView } from "./chat-view";

type Props = { chatId: string; fallback?: { chat: ChatSummary; messages: Message[] } };

/** Loads server-owned chat history when the workspace is connected to KURAI API. */
export function ChatLoader({ chatId, fallback }: Props) {
  const [snapshot, setSnapshot] = useState(fallback);
  const [error, setError] = useState<string | null>(null);
  const balanceMicro = useStore(balanceStore)?.micro ?? Infinity;

  useEffect(() => {
    if (!kuraiApi) return;
    let active = true;
    void kuraiApi
      .getChat(chatId)
      .then((next) => active && setSnapshot(next))
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "Не удалось открыть диалог."));
    return () => {
      active = false;
    };
  }, [chatId]);

  if (error) return <main className="grid flex-1 place-items-center p-6 text-center text-ink2"><p>{error}</p></main>;
  if (!snapshot) return <main className="grid flex-1 place-items-center p-6 text-[13px] text-ink3">Открываю рабочее пространство…</main>;
  // A fallback can render before the authenticated snapshot arrives. Remounting
  // on its last message keeps ChatView's local branch state server-authoritative.
  return <ChatView key={`${snapshot.chat.id}:${snapshot.messages.at(-1)?.id ?? "empty"}`} chat={snapshot.chat} initial={snapshot.messages} balanceMicro={balanceMicro} live={!!kuraiApi} />;
}
