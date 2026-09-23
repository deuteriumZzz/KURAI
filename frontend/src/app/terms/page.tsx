import type { Metadata } from "next";
import { DocPage } from "@/components/site/doc-page";
import { Hatch } from "@/components/fx/primitives";

export const metadata: Metadata = { title: "Условия использования — KURAI", description: "Правила пользования сервисом KURAI." };

export default function Page() {
  return (
    <DocPage eyebrow="Документы" title="Условия использования">
      <Hatch>Черновик структуры. Текст документа готовит юрист до запуска (152-ФЗ, 54-ФЗ, трансграничная передача данных).</Hatch>
    </DocPage>
  );
}
