import { ChatLoader } from "@/components/chat/chat-loader";
import { MOCK_CHATS, MOCK_MESSAGES } from "@/mocks/data";

export default async function ChatPage(props: PageProps<"/app/c/[id]">) {
  const { id } = await props.params;
  const chat = MOCK_CHATS.find((c) => c.id === id);
  return <ChatLoader chatId={id} fallback={chat ? { chat, messages: MOCK_MESSAGES.filter((m) => m.chatId === id) } : undefined} />;
}
