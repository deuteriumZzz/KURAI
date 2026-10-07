"use client";

import { useEffect, useState } from "react";
import { Label, Segments } from "@/components/fx/primitives";
import { kuraiApi, type KuraiMedia, type KuraiMember } from "@/lib/kurai-api";
import { MOCK_CHATS, MOCK_MEDIA, MOCK_PROJECTS, MOCK_USER } from "@/mocks/data";

type ProfileState = {
  member: KuraiMember;
  projects: number;
  chats: number;
  media: KuraiMedia[];
};

const demoState: ProfileState = {
  member: { id: MOCK_USER.id, email: MOCK_USER.email, displayName: MOCK_USER.name },
  projects: MOCK_PROJECTS.length,
  chats: MOCK_CHATS.length,
  media: MOCK_MEDIA.map((item) => ({
    id: item.id, kind: item.kind, url: item.url, contentType: "", sizeBytes: item.sizeBytes, prompt: item.prompt,
    model: item.model, costMicro: item.costMicro, chatId: item.chatId, messageId: item.messageId, createdAt: item.createdAt,
  })),
};

/** Account summary only derives values from the owned workspace API; no synthetic usage totals. */
export function ProfileDashboard() {
  const [profile, setProfile] = useState<ProfileState | null>(kuraiApi ? null : demoState);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!kuraiApi) return;
    let active = true;
    void Promise.all([kuraiApi.me(), kuraiApi.getWorkspace(), kuraiApi.media()])
      .then(([member, workspace, media]) => active && setProfile({ member, projects: workspace.projects.length, chats: workspace.chats.length, media }))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  if (failed) return <p role="status" className="bg-err-soft px-3 py-2 text-[13px] text-err">Не удалось загрузить сводку профиля. Обновите страницу или попробуйте позже.</p>;
  if (!profile) return <div aria-busy="true" className="min-h-80 bg-s1" />;

  const images = profile.media.filter((item) => item.kind === "image").length;
  const videos = profile.media.filter((item) => item.kind === "video").length;
  const audio = profile.media.filter((item) => item.kind === "audio").length;
  const max = Math.max(1, profile.projects, profile.chats, profile.media.length);
  const stats = [
    { label: "Проекты", value: profile.projects, fill: profile.projects / max },
    { label: "Чаты", value: profile.chats, fill: profile.chats / max },
    { label: "Медиафайлы", value: profile.media.length, fill: profile.media.length / max },
  ];

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 pl-16 md:pl-6">
        <h1 className="text-[16px] font-normal text-ink">Профиль</h1>
        <Label>{profile.member.email}</Label>
      </header>
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-6 md:grid-cols-[1.2fr_0.8fr] md:px-6">
        <section aria-labelledby="stats" className="flex flex-col gap-4">
          <div>
            <h2 id="stats" className="text-[15px] font-semibold">Ваше рабочее пространство</h2>
            <p className="mt-1 text-[13px] text-ink3">Сводка по объектам, которые доступны в аккаунте сейчас.</p>
          </div>
          <dl className="flex flex-col gap-4 border border-line bg-g1 p-5">
            {stats.map((stat) => (
              // в группе списка допустимы только dt/dd: шкала — второе значение под строкой
              <div key={stat.label} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1.5 text-[13.5px]">
                <dt className="text-ink2">{stat.label}</dt>
                <dd className="font-mono text-ink tabular-nums">{stat.value}</dd>
                <dd className="col-span-2">
                  <Segments value={stat.fill} count={16} label={stat.label} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-labelledby="media-summary" className="flex flex-col gap-4">
          <div>
            <h2 id="media-summary" className="text-[15px] font-semibold">Создано</h2>
            <p className="mt-1 text-[13px] text-ink3">Материалы остаются привязаны к чатам, где они были созданы.</p>
          </div>
          <dl className="grid grid-cols-3 gap-px border border-line bg-line">
            {[{ label: "Изображения", value: images }, { label: "Видео", value: videos }, { label: "Аудио", value: audio }].map((item) => (
              <div key={item.label} className="bg-g1 px-3 py-4">
                <dt className="text-[11px] text-ink3">{item.label}</dt>
                <dd className="k-display mt-2 text-[44px] text-ink">{item.value}</dd>
              </div>
            ))}
          </dl>
          <p className="bg-s1 p-4 text-[13px] leading-6 text-ink2">Публичная карточка профиля и расчёт экономии появятся после утверждения тарифной политики. Сейчас KURAI не публикует вашу активность и не строит вымышленные сравнения.</p>
        </section>
      </div>
      {!kuraiApi && <p className="mx-auto w-full max-w-5xl px-4 pb-6 text-[12px] text-ink3 md:px-6">Офлайн-прототип · значения на этом экране демонстрационные.</p>}
    </main>
  );
}
