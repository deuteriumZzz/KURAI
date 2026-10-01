"use client";

import Link from "next/link";
import { ArrowUpRight, FolderKanban, MessageSquare } from "lucide-react";
import { PageTitle } from "@/components/fx/page-title";
import { Label } from "@/components/fx/primitives";
import { chatsStore, projectsStore } from "@/lib/app-state";
import { projectChatOutline } from "@/lib/projects";
import { useStore } from "@/lib/store";

/** Project workspace is a truthful branch map: only chats actually attached to a project appear here. */
export default function ProjectsPage() {
  const projects = useStore(projectsStore);
  const chats = useStore(chatsStore);

  return (
    <main className="kurai-projects-page flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="kurai-projects-page__header flex h-14 shrink-0 items-center justify-between gap-3 px-4 pl-16 md:px-6 md:pl-6">
        <PageTitle title="Проекты" />
        <Label>{projects.length} активных контекстов</Label>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
        <section className="kurai-projects-intro">
          <p className="text-[17px] text-ink">Проект сохраняет связанные решения, а не просто собирает чаты в папку.</p>
          <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink2">Выберите ветку, чтобы продолжить конкретный ход работы. Состав проекта не создаётся автоматически и не скрывает обычную историю.</p>
        </section>

        {projects.length === 0 ? (
          <section className="border border-dashed border-line p-6 text-[13.5px] text-ink3">Проектов пока нет. Создайте первый через блок «Проекты» в боковой панели.</section>
        ) : (
          <ol className="kurai-project-map grid gap-px bg-line lg:grid-cols-2">
            {projects.map((project, projectIndex) => {
              const outline = projectChatOutline(project, chats);
              return (
                <li key={project.id} className="kurai-project-card bg-g1 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span aria-hidden="true" className="grid size-9 place-items-center bg-g2 text-ink2"><FolderKanban size={17} strokeWidth={1.5} /></span>
                      <div className="min-w-0">
                        <h2 className="truncate text-[17px] text-ink">{project.name}</h2>
                        <Label>PROJECT / {String(projectIndex + 1).padStart(2, "0")}</Label>
                      </div>
                    </div>
                    <Label>{outline.length} веток</Label>
                  </div>
                  <ol className="kurai-project-branches mt-5 flex flex-col">
                    {outline.length > 0 ? outline.map((chat, index) => (
                      <li key={chat.id} className="kurai-project-branch">
                        <Link href={`/app/c/${chat.id}`} className="group flex min-w-0 items-center gap-3 py-2.5">
                          <span className="grid size-6 shrink-0 place-items-center border border-line font-mono text-[10px] text-ink3">{String(index + 1).padStart(2, "0")}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] text-ink2 group-hover:text-ink">{chat.title}</span>
                            {chat.preview && <span className="mt-0.5 block truncate text-[12px] text-ink3">{chat.preview}</span>}
                          </span>
                          <ArrowUpRight size={14} strokeWidth={1.5} className="shrink-0 text-ink3 group-hover:text-acc" />
                        </Link>
                      </li>
                    )) : (
                      <li className="flex items-center gap-2 py-3 text-[13px] text-ink3"><MessageSquare size={14} strokeWidth={1.5} /> В этом проекте пока нет прикреплённых веток.</li>
                    )}
                  </ol>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </main>
  );
}
