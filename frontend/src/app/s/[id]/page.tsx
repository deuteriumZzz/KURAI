import type { Metadata } from "next";
import { SharedChatClient } from "@/components/shared/shared-chat-client";

export const metadata: Metadata = {
  title: "Общий результат — KURAI",
  description: "Результат KURAI, доступный по защищённой ссылке только для чтения.",
  // снимок по личной ссылке не должен попадать в поиск
  robots: { index: false, follow: false },
};

/** The token is exchanged with the public endpoint; it is never treated as a chat id. */
export default async function SharedChat(props: PageProps<"/s/[id]">) {
  const { id } = await props.params;
  return <SharedChatClient token={id} />;
}
