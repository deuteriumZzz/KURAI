import type { Micro, Plan } from "@/types/api";

/** Средняя цена единицы в micro (1 кредит = 10 000). Совпадает с оценками в поле ввода. */
export const UNIT_MICRO = { text: 20_000, image: 40_000, video: 1_200_000 } as const;

export const PLANS: { id: Plan; name: string; priceRub: number; grantMicro: Micro; features: string[] }[] = [
  { id: "free", name: "Free", priceRub: 0, grantMicro: 50_000, features: ["5 запросов к текстовым моделям", "5 кредитов на медиа", "История 30 дней"] },
  { id: "pro", name: "Pro", priceRub: 990, grantMicro: 10_000_000, features: ["+1 000 кредитов ежемесячно", "Все модели, видео и слайды", "Медиатека 5 ГБ"] },
  { id: "ultra", name: "Ultra", priceRub: 2990, grantMicro: 35_000_000, features: ["+3 500 кредитов ежемесячно", "Приоритетная очередь", "API-доступ · медиатека 50 ГБ"] },
];

export const ANNUAL_DISCOUNT = 0.15;

/** Цена тарифа за месяц с учётом годовой оплаты, в рублях (округление вниз до рубля). */
export function planPrice(priceRub: number, annual: boolean): number {
  return annual ? Math.floor(priceRub * (1 - ANNUAL_DISCOUNT)) : priceRub;
}

export type Usage = { texts: number; images: number; videos: number };

export function estimateMicro(u: Usage): Micro {
  return u.texts * UNIT_MICRO.text + u.images * UNIT_MICRO.image + u.videos * UNIT_MICRO.video;
}

/** Самый дешёвый вариант: тариф + докупка кредитов (1 кр = 1 ₽). Возвращает рубли в месяц. */
export function bestPlan(u: Usage): { plan: Plan; totalRub: number; topUpRub: number } {
  const need = estimateMicro(u);
  let best = { plan: "free" as Plan, totalRub: Infinity, topUpRub: 0 };
  for (const p of PLANS) {
    const missing = Math.max(0, need - p.grantMicro);
    const topUpRub = Math.ceil(missing / 10_000);
    const totalRub = p.priceRub + topUpRub;
    if (totalRub < best.totalRub) best = { plan: p.id, totalRub, topUpRub };
  }
  return best;
}
