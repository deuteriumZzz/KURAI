"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, FolderKanban, MessageSquare } from "lucide-react";
import { PageTitle } from "@/components/fx/page-title";
import { Label } from "@/components/fx/primitives";
import { chatsStore, projectsStore } from "@/lib/app-state";
import { projectChatOutline } from "@/lib/projects";
import { useStore } from "@/lib/store";
import { kuraiApi } from "@/lib/kurai-api";
import { ActionButton } from "@/components/ui/action-button";
import type { Project } from "@/types/api";

/** 101 — общие инструкции проекта: уходят модели системным сообщением в каждом его чате. */
function Instructions({ project, models }: { project: Project; models: { id: string; name: string }[] }) {
  const [text, setText] = useState(project.instructions ?? "");
  const [model, setModel] = useState(project.defaultModel ?? "");
  const unchanged = text.trim() === (project.instructions ?? "") && model === (project.defaultModel ?? "");
  return (
    <details className="mt-4 rounded-(--radius-md) border border-line px-3 py-2" open={!!project.instructions || undefined}>
      <summary className="cursor-pointer text-[13px] text-ink2 hover:text-ink">
        Инструкции и модель проекта {project.instructions || project.defaultModel ? <span className="k-meta">· применяются</span> : <span className="k-meta">· не заданы</span>}
      </summary>
      <label className="mt-2 block">
        <span className="fx-sr">Инструкции проекта «{project.name}»</span>
        <textarea
          value={text}
          maxLength={4000}
          onChange={(e) => setText(e.target.value)}
          placeholder="Например: отвечай по-русски, кратко; целевая аудитория — малый бизнес."
          className="block min-h-24 w-full resize-y rounded-(--radius-sm) border border-line2 bg-g1 px-3 py-2 text-[13.5px] text-ink outline-none field-sizing-content focus:border-ink3"
        />
      </label>
      <label className="mt-2 flex items-center justify-between gap-3 text-[13px]">
        <span className="text-ink2">Модель по умолчанию</span>
        <select value={model} onChange={(e) => setModel(e.target.value)} className="h-8 max-w-[60%] rounded-(--radius-sm) border border-line2 bg-g1 px-2 text-[12.5px] text-ink outline-none focus:border-ink3">
          <option value="">как в настройках</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </label>
      <div className="mt-2 flex items-center justify-between gap-3 pb-1">
        <span className="text-[11.5px] text-ink3">{text.length} / 4000 · общие для всех чатов проекта</span>
        <ActionButton
          size="sm"
          disabled={!kuraiApi || unchanged}
          onAction={async () => {
            if (!kuraiApi) return;
            const saved = await kuraiApi.updateProject(project.id, { instructions: text, defaultModel: model });
            projectsStore.set((xs) => xs.map((x) => (x.id === project.id ? { ...x, instructions: saved.instructions, defaultModel: saved.defaultModel } : x)));
          }}
        >
          Сохранить
        </ActionButton>
      </div>
    </details>
  );
}

/** Project workspace is a truthful branch map: only chats actually attached to a project appear here. */
export default function ProjectsPage() {
  const projects = useStore(projectsStore);
  const chats = useStore(chatsStore);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    void kuraiApi?.models("text").then((list) => setModels(list.map((m) => ({ id: m.id, name: m.name })))).catch(() => undefined);
  }, []);

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
                  <Instructions project={project} models={models} />
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
