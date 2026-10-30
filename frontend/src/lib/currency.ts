/**
 * Валюта показа цен. Кредиты и списания — в долларовой базе; здесь только то, как показать сумму человеку:
 * валюта берётся из региона браузера (или выбора в настройках), курс — живой с сервера, без зашитых чисел.
 */
const EURO = ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "PT", "IE", "FI", "GR", "SK", "SI", "LT", "LV", "EE", "LU", "HR", "CY", "MT"];
const REGION_CURRENCY: Record<string, string> = {
  ...Object.fromEntries(EURO.map((r) => [r, "EUR"])),
  RU: "RUB", BY: "BYN", KZ: "KZT", UA: "UAH", UZ: "UZS", GE: "GEL", AM: "AMD", AZ: "AZN", KG: "KGS", MD: "MDL", TR: "TRY",
  GB: "GBP", CH: "CHF", PL: "PLN", CZ: "CZK", SE: "SEK", NO: "NOK", DK: "DKK", HU: "HUF", RO: "RON", BG: "BGN",
  CA: "CAD", AU: "AUD", NZ: "NZD", JP: "JPY", KR: "KRW", CN: "CNY", IN: "INR", BR: "BRL", MX: "MXN", AE: "AED",
  IL: "ILS", SG: "SGD", HK: "HKD", ZA: "ZAR", US: "USD",
};

export type Rates = { base: "USD"; rates: Record<string, number>; updatedAt: string };

/** Регион из языка браузера: «ru» → RU, «en-GB» → GB. */
export function regionOf(locale: string | undefined): string | undefined {
  if (!locale) return undefined;
  try {
    return new Intl.Locale(locale).maximize().region;
  } catch {
    return undefined;
  }
}

/** Валюта показа: явный выбор, иначе по региону; нет курса на эту валюту — доллар (честно, без выдуманного числа). */
export function currencyFor(locale: string | undefined, choice: string, rates: Rates | null): string {
  const wanted = choice !== "auto" ? choice : (REGION_CURRENCY[regionOf(locale) ?? ""] ?? "USD");
  return wanted === "USD" || rates?.rates[wanted] ? wanted : "USD";
}

export function convertUsd(usd: number, code: string, rates: Rates | null): number {
  return code === "USD" || !rates ? usd : usd * (rates.rates[code] ?? 1);
}

/** «Красивая» сумма: до 10 — как есть, дальше шаг растёт с величиной (987,43 → 990), чтобы цена не выглядела дробной. */
export function niceAmount(amount: number): number {
  const a = Math.abs(amount);
  const step = a < 10 ? 0 : a < 100 ? 1 : a < 1000 ? 10 : a < 10_000 ? 50 : 100;
  return step ? Math.round(amount / step) * step : amount;
}

export function formatMoney(amount: number, code: string, locale?: string): string {
  amount = niceAmount(amount);
  const digits = Math.abs(amount) >= 100 ? 0 : 2;
  const min = digits === 0 || Number.isInteger(amount) ? 0 : 2;
  return new Intl.NumberFormat(locale, { style: "currency", currency: code, minimumFractionDigits: min, maximumFractionDigits: digits }).format(amount);
}

/** Валюты, которые предлагаем в настройках (если на них есть курс). */
export const CURRENCY_CHOICES = ["USD", "EUR", "RUB", "KZT", "UAH", "BYN", "GBP", "TRY", "PLN", "AED", "CNY", "INR"] as const;
