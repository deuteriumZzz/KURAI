import type { ReactNode } from "react";
import { Hatch } from "@/components/fx/primitives";

export function LegalDraftNotice() {
  return (
    <Hatch tone="warn">
      <p className="font-medium">Черновик до публичного запуска</p>
      <p className="mt-2">Перед публикацией заполните реквизиты оператора: статус ИП или ООО, ФИО предпринимателя либо полное наименование, ИНН, ОГРНИП/ОГРН, юридический адрес, контакт для обращений и дату вступления в силу. После этого текст должен проверить юрист по юрисдикции запуска.</p>
    </Hatch>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-line pt-5">
      <h2 className="text-[16px] font-medium">{title}</h2>
      <div className="max-w-[68ch] text-[14px] leading-7 text-ink2">{children}</div>
    </section>
  );
}

export const OperatorFields = () => (
  <span className="font-mono text-[12px] text-acc">[ФИО/наименование] · [ИНН] · [ОГРНИП/ОГРН] · [адрес] · [email для обращений]</span>
);
