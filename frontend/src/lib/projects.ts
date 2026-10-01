import type { ChatSummary, Project } from "@/types/api";

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function projectId(name: string, existingIds: string[] = []) {
  const slug = [...name.toLowerCase()]
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const base = `project-${slug || "untitled"}`;
  const occupied = new Set(existingIds);
  let id = base;
  let suffix = 2;
  while (occupied.has(id)) id = `${base}-${suffix++}`;
  return id;
}

/** Создаёт локальный проект в API-совместимой форме. */
export function createProject(name: string, createdAt: string, existingIds: string[] = []): Project {
  const title = name.trim().replace(/\s+/g, " ") || "Новый проект";
  return { id: projectId(title, existingIds), name: title, chatIds: [], createdAt };
}

/** Идентификаторы чатов, уже показанных внутри проектов. */
export function projectChatIds(projects: Project[]) {
  return new Set(projects.flatMap((project) => project.chatIds));
}

/** Обычная история не дублирует чаты, прикреплённые к проектам. */
export function chatsOutsideProjects(chatIds: string[], projects: Project[]) {
  const assigned = projectChatIds(projects);
  return chatIds.filter((chatId) => !assigned.has(chatId));
}

/** The Branch Map respects the project's deliberate order; missing archived chats
 * are omitted rather than replaced with invented entries. */
export function projectChatOutline(project: Project, chats: ChatSummary[]) {
  const byId = new Map(chats.map((chat) => [chat.id, chat]));
  return project.chatIds.flatMap((id) => {
    const chat = byId.get(id);
    return chat ? [chat] : [];
  });
}
