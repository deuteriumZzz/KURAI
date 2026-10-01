import type { Metadata } from "next";
import { DocPage } from "@/components/site/doc-page";
import { LiveStatus } from "@/components/status/live-status";

export const metadata: Metadata = { title: "Статус KURAI", description: "Доступность моделей и сервисов KURAI в реальном времени." };

export default function StatusPage() {
  return (
    <DocPage eyebrow="Статус" title="Состояние сервисов" lead="Здесь отображается только фактическая доступность подключённых возможностей, без выдуманного uptime или неактивных интеграций.">
      <LiveStatus />
    </DocPage>
  );
}
