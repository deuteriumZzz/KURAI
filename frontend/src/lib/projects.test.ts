import { describe, expect, it } from "vitest";
import { chatsOutsideProjects, createProject, projectChatOutline, projectChatIds } from "./projects";

describe("projects", () => {
  it("creates a trimmed project with a stable local id", () => {
    expect(createProject("  Новый запуск  ", "2026-09-24T10:00:00Z")).toEqual({
      id: "project-novyy-zapusk",
      name: "Новый запуск",
      chatIds: [],
      createdAt: "2026-09-24T10:00:00Z",
    });
  });

  it("keeps regular chat history separate from project chats", () => {
    const projects = [
      { id: "p1", name: "Маркетинг", chatIds: ["c1", "c2"], createdAt: "2026-09-20T10:00:00Z" },
      { id: "p2", name: "Исследование", chatIds: ["c2", "c3"], createdAt: "2026-09-21T10:00:00Z" },
    ];

    expect([...projectChatIds(projects)]).toEqual(["c1", "c2", "c3"]);
    expect(chatsOutsideProjects(["c1", "c2", "c3", "c4"], projects)).toEqual(["c4"]);
  });

  it("suffixes duplicate project names to keep ids unique", () => {
    expect(createProject("Новый запуск", "2026-09-24T10:00:00Z", ["project-novyy-zapusk"]).id).toBe("project-novyy-zapusk-2");
  });

  it("keeps a project branch map in its deliberate chat order and drops missing chats", () => {
    const project = { id: "p1", name: "Маркетинг", chatIds: ["c2", "missing", "c1"], createdAt: "2026-09-20T10:00:00Z" };
    const chats = [
      { id: "c1", title: "Итог", updatedAt: "2026-09-20T12:00:00Z", pinned: false, headId: "m1" },
      { id: "c2", title: "Исследование", updatedAt: "2026-09-20T11:00:00Z", pinned: false, headId: "m2" },
    ];

    expect(projectChatOutline(project, chats).map((chat) => chat.id)).toEqual(["c2", "c1"]);
  });
});
