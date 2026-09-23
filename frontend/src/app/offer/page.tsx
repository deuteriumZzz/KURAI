import type { Metadata } from "next";
import { DocPage } from "@/components/site/doc-page";
import { Hatch } from "@/components/fx/primitives";

export const metadata: Metadata = { title: "Публичная оферта — KURAI", description: "Договор на оказание услуг доступа к нейросетям." };

export default function Page() {
  return (
    <DocPage eyebrow="Документы" title="Публичная оферта">
      <Hatch>Черновик структуры. Текст документа готовит юрист до запуска (152-ФЗ, 54-ФЗ, трансграничная передача данных).</Hatch>
    </DocPage>
  );
}
