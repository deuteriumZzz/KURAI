import { notFound } from "next/navigation";
import type { Message, MessagePart } from "@/types/api";
import { Composer } from "@/components/app/composer";
import { Decode } from "@/components/fx/decode";
import { Label, Segments, SysLine } from "@/components/fx/primitives";
import { formatCredits } from "@/lib/format";
import { modeById } from "@/lib/modes";
import { branchOf, MOCK_CHATS } from "@/mocks/data";

const JOB_LABEL = { image: "Изображение", video: "Видео", audio: "Аудио", research: "Исследование", slides: "Слайды" } as const;

function Part({ part }: { part: MessagePart }) {
  if (part.type === "text") return <p className="whitespace-pre-wrap">{part.text}</p>;
  if (part.type === "job") {
    const done = part.status === "done";
    return (
      <div className="flex max-w-md flex-col gap-2 border border-line bg-g1 p-3">
        <Segments value={part.progress} count={16} label={`${JOB_LABEL[part.kind]}: прогресс`} />
        <SysLine tone={done ? "acc" : "default"}>
          {`${JOB_LABEL[part.kind]} · ${done ? "готово" : `генерация · ${Math.round(part.progress * 100)}%`}`}
        </SysLine>
      </div>
    );
  }
  return null;
}

function Bubble({ m }: { m: Message }) {
  if (m.role === "user") {
    return (
      <div className="ml-auto max-w-[80%] border border-line bg-g2 px-3.5 py-2.5 text-[14.5px]">
        {m.mode !== "text" && <Label className="mb-1 block text-acc">{modeById(m.mode).label}</Label>}
        {m.parts.map((p, i) => (
          <Part key={i} part={p} />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 text-[14.5px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="border border-acc-line bg-acc-soft px-1.5 py-0.5 font-mono text-[11px] text-acc">{m.model}</span>
        {m.costMicro > 0 && <Label className="tracking-[0.05em]">{formatCredits(m.costMicro)}</Label>}
      </div>
      {m.parts.map((p, i) => (
        <Part key={i} part={p} />
      ))}
    </div>
  );
}

/** Шелл единого чата. Стриминг, ветки и медиа-карточки — секция «Единый чат». */
export default async function ChatPage(props: PageProps<"/app/c/[id]">) {
  const { id } = await props.params;
  const chat = MOCK_CHATS.find((c) => c.id === id);
  if (!chat) notFound();
  const messages = branchOf(chat.headId);
  const total = messages.reduce((s, m) => s + m.costMicro, 0);

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 pl-16 md:pl-6">
        <h1 className="truncate text-[14px]">
          <Decode text={chat.title} />
        </h1>
        <Label className="shrink-0">
          #{chat.id.toUpperCase()} · {messages.length} сообщ. · {formatCredits(total)}
        </Label>
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-6">
          {messages.map((m) => (
            <Bubble key={m.id} m={m} />
          ))}
        </div>
      </div>
      <div className="flex justify-center border-t border-line px-4 pt-3 pb-4">
        <Composer variant="dock" initialMode="video" />
      </div>
    </main>
  );
}
