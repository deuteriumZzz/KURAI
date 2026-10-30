"use client";

import { formatCredits } from "@/lib/format";
import { useMoney } from "@/lib/use-money";

/** Сумма в валюте региона; secondary — тихая подпись «≈ …» рядом с кредитами, пока нет своей валюты не показывается. */
export function Money({ usd, micro, secondary, className }: { usd?: number; micro?: number; secondary?: boolean; className?: string }) {
  const money = useMoney();
  if (secondary && !(money.ready && money.local)) return null;
  const text = micro !== undefined ? money.micro(micro) : money.usd(usd ?? 0);
  return <span className={className}>{secondary ? `≈ ${text}` : text}</span>;
}

/** Цена за 1 млн токенов: вход и выход отдельными строками, в кредитах и (если валюта не доллар) в валюте региона. */
export function PerMillion({ value, className }: { value?: { input: number; output: number }; className?: string }) {
  const money = useMoney();
  if (!value) return null;
  const local = money.ready && money.local;
  const line = (label: string, micro: number) => (
    <span className="block">
      {label} {formatCredits(micro)}
      {local && <span className="text-ink3"> · {money.micro(micro)}</span>}
    </span>
  );
  return (
    <span className={className}>
      <span className="block">1 млн токенов</span>
      {line("вход", value.input)}
      {line("выход", value.output)}
    </span>
  );
}
