"use client";

import { useEffect, useState } from "react";
import { kuraiApi } from "@/lib/kurai-api";
import { MOCK_USER } from "@/mocks/data";
import type { User } from "@/types/api";
import { SettingsForm } from "./settings-form";

/** Loads the signed-in identity once rather than rendering a demo profile in an active workspace. */
export function AccountSettings() {
  const [user, setUser] = useState<User | null>(kuraiApi ? null : MOCK_USER);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!kuraiApi) return;
    let active = true;
    void kuraiApi.me()
      .then((member) => active && setUser({ id: member.id, email: member.email, name: member.displayName }))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  if (failed) return <p role="status" className="bg-err-soft px-3 py-2 text-[13px] text-err rounded-(--radius-md)">Не удалось загрузить данные профиля. Обновите страницу или попробуйте позже.</p>;
  if (!user) return <div aria-busy="true" className="min-h-56 bg-s1" />;

  return (
    <>
      <SettingsForm user={user} />
      {!kuraiApi && <p className="mt-5 text-[12px] text-ink3">Офлайн-прототип · профиль не связан с серверным аккаунтом.</p>}
    </>
  );
}
