import type { Id, Message } from "@/types/api";

/** Активная ветка: от head к корню по parentId, в хронологическом порядке. */
export function branchOf(headId: Id, messages: Message[]): Message[] {
  const byId = new Map(messages.map((m) => [m.id, m]));
  const out: Message[] = [];
  for (let m = byId.get(headId); m; m = m.parentId ? byId.get(m.parentId) : undefined) out.unshift(m);
  return out;
}

/** Версии ответа: сообщения той же роли с тем же родителем, по времени создания. */
export function siblingsOf(id: Id, messages: Message[]): Message[] {
  const self = messages.find((m) => m.id === id);
  if (!self) return [];
  return messages
    .filter((m) => m.parentId === self.parentId && m.role === self.role)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

/** Самый свежий лист под сообщением — куда встать при переключении версии. */
export function leafOf(id: Id, messages: Message[]): Id {
  let current = id;
  for (;;) {
    const children = messages.filter((m) => m.parentId === current);
    if (children.length === 0) return current;
    current = children.reduce((a, b) => (Date.parse(b.createdAt) > Date.parse(a.createdAt) ? b : a)).id;
  }
}
