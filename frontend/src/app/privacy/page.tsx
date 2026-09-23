import type { Metadata } from "next";
import { DocPage } from "@/components/site/doc-page";
import { Hatch } from "@/components/fx/primitives";

export const metadata: Metadata = { title: "Политика конфиденциальности — KURAI", description: "Как KURAI обрабатывает персональные данные по 152-ФЗ." };

export default function Page() {
  return (
    <DocPage eyebrow="Документы" title="Политика конфиденциальности">
      <Hatch>Черновик структуры. Текст документа готовит юрист до запуска (152-ФЗ, 54-ФЗ, трансграничная передача данных).</Hatch>
    </DocPage>
  );
}
