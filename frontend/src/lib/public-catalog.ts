import { fromCatalogModel, type ModelInfo } from "@/lib/models";
import type { KuraiCatalogModel } from "@/lib/kurai-api";
import type { Mode } from "@/types/api";

export type PublicMode = { id: Mode; available: boolean; modelCount: number };
export type PublicCatalog = {
  modes: PublicMode[];
  textModels: number;
  providers: { name: string; count: number }[];
  /** Ориентир цены типового запроса в «Авто» — тот же, что в выборе модели в кабинете. */
  autoPriceMicro: ModelInfo["priceHintMicro"] | null;
};

const BASE = process.env.NEXT_PUBLIC_KURAI_API_BASE_URL?.replace(/\/$/, "");

async function read<T>(path: string): Promise<T | null> {
  if (!BASE) return null;
  try {
    // каталог меняется редко: публичные страницы пересобираются раз в 5 минут
    const res = await fetch(`${BASE}${path}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return ((await res.json()) as { data: T }).data;
  } catch {
    return null;
  }
}

/** Провайдер для людей — из имени каталога («Anthropic: Claude …»), а не из технического префикса id. */
export const providerOf = (m: { id: string; name: string }) => (m.name.includes(": ") ? m.name.split(": ")[0]! : m.id.split("/")[0]!);
/** Имя без провайдера: на страницах каталога провайдер стоит отдельной строкой. */
export const shortName = (m: { name: string }) => (m.name.includes(": ") ? m.name.split(": ").slice(1).join(": ") : m.name);

export type PublicModel = ModelInfo & { priceKnown: boolean };

/**
 * Тот же каталог и те же ориентиры цены, что видит участник перед отправкой. null — сервер не подключён.
 * Порядок: «Авто», затем провайдеры с бо́льшим числом моделей — так знакомые имена оказываются наверху.
 */
export async function publicModels(): Promise<PublicModel[] | null> {
  const models = await read<KuraiCatalogModel[]>("/api/v1/models");
  if (!models) return null;
  const list = models.map((m) => ({
    ...fromCatalogModel(m),
    name: m.id === "openrouter/auto" ? "Авто" : shortName(m),
    provider: m.id.startsWith("openrouter/") ? "KURAI" : providerOf(m),
    priceKnown: m.priceKnown !== false,
  }));
  const size = new Map<string, number>();
  for (const m of list) size.set(m.provider, (size.get(m.provider) ?? 0) + 1);
  const rank = (m: PublicModel) => (m.id === "openrouter/auto" ? Infinity : (size.get(m.provider) ?? 0));
  return list.sort((a, b) => rank(b) - rank(a) || a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));
}

/** Живой каталог для лендинга. null — сервер не подключён: страница не называет чисел. */
export async function publicCatalog(): Promise<PublicCatalog | null> {
  const [caps, models] = await Promise.all([read<{ modes: PublicMode[] }>("/api/v1/capabilities"), publicModels()]);
  if (!caps) return null;
  // служебные варианты вроде «:batch» и маршрутизаторы OpenRouter не считаем
  const counts = new Map<string, number>();
  for (const m of models ?? []) {
    if (m.id.startsWith("openrouter/") || m.id.includes(":") || !m.modes.includes("text")) continue;
    counts.set(m.provider, (counts.get(m.provider) ?? 0) + 1);
  }
  return {
    modes: caps.modes,
    textModels: caps.modes.find((m) => m.id === "text")?.modelCount ?? 0,
    providers: [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 16),
    autoPriceMicro: models?.find((m) => m.id === "openrouter/auto")?.priceHintMicro ?? null,
  };
}
