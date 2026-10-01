import { PageTitle } from "@/components/fx/page-title";
import { AccountSettings } from "@/components/settings/account-settings";

export default function SettingsPage() {
  return (
    <main className="kurai-settings-page flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="kurai-settings-page__header flex h-14 shrink-0 items-center border-b border-line px-4 pl-16 md:pl-6">
        <PageTitle title="Настройки" />
      </header>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
        <AccountSettings />
      </div>
    </main>
  );
}
