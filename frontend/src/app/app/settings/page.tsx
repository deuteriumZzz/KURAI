import { SettingsForm } from "@/components/settings/settings-form";
import { MOCK_USER } from "@/mocks/data";

export default function SettingsPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center border-b border-line px-4 pl-16 md:pl-6">
        <h1 className="font-display text-lg font-light">Настройки</h1>
      </header>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
        <SettingsForm user={MOCK_USER} />
      </div>
    </main>
  );
}
