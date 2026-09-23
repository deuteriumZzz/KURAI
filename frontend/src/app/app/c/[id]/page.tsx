import { notFound } from "next/navigation";
import { ChatView } from "@/components/chat/chat-view";
import { MOCK_CHATS, MOCK_MESSAGES } from "@/mocks/data";

export default async function ChatPage(props: PageProps<"/app/c/[id]">) {
  const { id } = await props.params;
  const chat = MOCK_CHATS.find((c) => c.id === id);
  if (!chat) notFound();
  return <ChatView chat={chat} initial={MOCK_MESSAGES.filter((m) => m.chatId === id)} />;
}
