/**
 * The server has no Telegram OAuth endpoint yet. Showing a generated QR here
 * would create a false security expectation, so this stays intentionally
 * informational until the signed callback flow exists.
 */
export function TelegramLogin() {
  return (
    <p className="border border-line bg-g1 px-3 py-2.5 text-center text-[12.5px] leading-5 text-ink3">
      Вход через Telegram пока не подключён.
    </p>
  );
}
