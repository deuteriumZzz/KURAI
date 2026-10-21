"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { StarBounce } from "./model-picker";
import { flyTo, SPRING } from "@/lib/motion";
import { ModelGlyph, glyphKind } from "@/components/brand/model-glyph";
import { cn } from "@/lib/cn";
import { formatCredits } from "@/lib/format";
import { fromCatalogModel, GROUP_LABEL, MODELS, type ModelInfo } from "@/lib/models";
import { kuraiApi } from "@/lib/kurai-api";
import { readPrefs, toggleFavorite, writePrefs } from "@/lib/prefs";

export type CatalogFilter = "all" | "text" | "image" | "video" | "audio";

function fitsFilter(model: ModelInfo, filter: CatalogFilter) {
  return filter === "all" || model.modes.includes(filter);
}

/** The live catalog is authoritative whenever an API origin is configured; static entries exist only for the offline prototype. */
export function ModelCatalog({ filter }: { filter: CatalogFilter }) {
  const [models, setModels] = useState<ModelInfo[]>(() => (kuraiApi ? [] : MODELS));
  const [state, setState] = useState<"loading" | "ready" | "error" | "prototype">(kuraiApi ? "loading" : "prototype");
  // избранное — после гидрации: на сервере его нет, иначе первая отрисовка разойдётся
  const [favorites, setFavorites] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    if (!kuraiApi) return;
    let active = true;
    void kuraiApi.models().then(
      (catalog) => {
        if (!active) return;
        setModels(catalog.map(fromCatalogModel));
        setState("ready");
      },
      () => active && setState("error"),
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const syncFavorites = () => setFavorites(readPrefs().favorites);
    syncFavorites();
    window.addEventListener("kurai:prefs", syncFavorites);
    return () => window.removeEventListener("kurai:prefs", syncFavorites);
  }, []);

  const list = useMemo(() => {
    const filtered = models.filter((model) => fitsFilter(model, filter));
    // избранное, затем группы в постоянном порядке (живой каталог приходит по алфавиту — заголовки групп не повторяются)
    const order = Object.keys(GROUP_LABEL);
    return [...filtered].sort((left, right) => Number(favorites.includes(right.id)) - Number(favorites.includes(left.id)) || order.indexOf(left.group) - order.indexOf(right.group));
  }, [favorites, filter, models]);
  const comparedModels = useMemo(
    () => compareIds.map((modelId) => models.find((model) => model.id === modelId)).filter((model): model is ModelInfo => Boolean(model)),
    [compareIds, models],
  );
  const canRunComparison = comparedModels.length >= 2 && comparedModels.every((model) => model.modes.includes("text"));
  const compareHref = `/app?compare=${encodeURIComponent(comparedModels.map((model) => model.id).join(","))}`;

  function updateFavorite(modelId: string) {
    const next = toggleFavorite(favorites, modelId);
    setFavorites(next);
    writePrefs({ favorites: next });
  }

  function updateComparison(modelId: string, glyph?: Element | null) {
    // 62 — знак модели улетает в счётчик сравнения (счётчик появляется в том же кадре, что и новый id)
    if (glyph && !compareIds.includes(modelId) && compareIds.length < 3) {
      requestAnimationFrame(() => {
        const counter = document.querySelector("[data-compare-count]");
        if (counter) void flyTo(glyph, counter, { arc: 40, endScale: 0.4 });
      });
    }
    setCompareIds((current) => {
      if (current.includes(modelId)) return current.filter((id) => id !== modelId);
      return current.length < 3 ? [...current, modelId] : current;
    });
  }

  if (state === "loading") {
    return <div aria-label="Загружаю модели" className="flex flex-col gap-px">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-16 animate-pulse bg-s1" />)}</div>;
  }
  if (state === "error") {
    return <p role="alert" className="bg-err-soft px-4 py-3 text-[13.5px] text-err rounded-(--radius-md)">Не удалось получить актуальный каталог. Проверьте подключение к API и попробуйте обновить страницу.</p>;
  }

  return (
    <>
      <p className="text-[12.5px] text-ink3">
        {state === "prototype" ? "Офлайн-прототип: список не отражает доступность сервера." : `Активный каталог сервера · моделей: ${models.length}`}
        {favorites.length > 0 && " Избранные закреплены первыми."}
      </p>
      {comparedModels.length > 0 && (
        <section id="compare" aria-label="Сравнение маршрутов" className="scroll-mt-4 overflow-x-auto rounded-(--radius-md) border border-violet-line bg-g1">
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="text-[14px] text-violet">Сравнение маршрутов · {comparedModels.length}/3</h2>
            <div className="flex max-w-md flex-wrap items-center justify-end gap-2 text-right">
              <p className="text-[12px] leading-snug text-ink3">Это ориентиры каталога до запуска. Точная цена подтверждается перед каждым запросом.</p>
              {canRunComparison ? (
                <Link href={compareHref} className="k-tool h-8 shrink-0 bg-violet-soft text-[12.5px] text-violet">
                  Сравнить ответы
                </Link>
              ) : (
                <span className="text-[11px] text-ink3">Выберите ещё одну текстовую модель.</span>
              )}
            </div>
          </header>
          <table className="w-full min-w-[580px] border-collapse text-left text-[12px]">
            <thead>
              <tr className="bg-s1 text-ink3">
                <th scope="col" className="w-32 px-4 py-2 font-normal">Критерий</th>
                {comparedModels.map((model) => (
                  <th scope="col" key={model.id} className="min-w-44 border-l border-line px-3 py-2 font-normal">
                    <div className="flex items-center justify-between gap-2 text-ink">
                      <span className="truncate">{model.name}</span>
                      <button type="button" onClick={() => updateComparison(model.id)} aria-label={`Убрать ${model.name} из сравнения`} className="grid size-6 shrink-0 place-items-center text-ink3 transition-colors hover:text-ink">
                        <X aria-hidden="true" size={13} strokeWidth={1.5} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {([
                ["Задача", (model: ModelInfo) => model.note],
                ["Контекст", (model: ModelInfo) => model.contextK > 0 ? `${model.contextK >= 1000 ? `${model.contextK / 1000}M` : `${model.contextK}K`}` : "—"],
                ["Оценка", (model: ModelInfo) => formatCredits(model.priceHintMicro, { approx: true })],
              ] as const).map(([label, value]) => (
                <tr key={label} className="border-t border-line">
                  <th scope="row" className="px-4 py-2 font-normal text-ink3">{label}</th>
                  {comparedModels.map((model) => <td key={model.id} className="border-l border-line px-3 py-2 text-ink2">{value(model)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {list.length === 0 ? (
        <p className="border border-line px-4 py-8 text-center text-[13.5px] text-ink3 rounded-(--radius-md)">Для этого режима нет активных моделей.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="kurai-model-registry w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr className="text-[12.5px] text-ink3">
                <th scope="col" className="py-2.5 pr-3 pl-3 font-normal">Модель</th>
                <th scope="col" className="px-3 py-2.5 font-normal">Для каких задач</th>
                <th scope="col" className="w-24 px-3 py-2.5 font-normal">Контекст</th>
                <th scope="col" className="w-24 px-3 py-2.5 font-normal">Цена</th>
                <th scope="col" className="w-[17rem] py-2.5 pr-3 pl-3 text-right font-normal"><span className="fx-sr">Действия</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((model, index) => {
                const fav = favorites.includes(model.id);
                const compared = compareIds.includes(model.id);
                const header = !fav && (index === 0 || favorites.includes(list[index - 1]!.id) || list[index - 1]!.group !== model.group) ? GROUP_LABEL[model.group] : index === 0 && fav ? "Избранные" : null;
                return (
                  <Fragment key={model.id}>
                    {header && (
                      <tr>
                        <td colSpan={5} className="k-index px-3 pt-6 pb-2">{header}</td>
                      </tr>
                    )}
                    <tr className="group border-t border-line transition-colors duration-(--dur-fast) hover:bg-s1">
                      <th scope="row" className="py-3.5 pr-3 pl-3 text-left font-normal">
                        <span className="flex items-center gap-3">
                          <ModelGlyph id={model.id} kind={glyphKind(model.group)} size={22} />
                          <span className="min-w-0">
                            <span className="block text-[14.5px] text-ink">{model.name}</span>
                            <span className="block text-[12px] text-ink3">{model.provider}</span>
                          </span>
                        </span>
                      </th>
                      <td className="px-3 py-3.5 text-[13.5px] leading-snug [overflow-wrap:anywhere] text-ink2">{model.note}</td>
                      <td className="px-3 py-3.5 font-mono text-[12.5px] text-ink2">{model.contextK > 0 ? (model.contextK >= 1000 ? `${model.contextK / 1000}M` : `${model.contextK}K`) : "—"}</td>
                      <td className="px-3 py-3.5 font-mono text-[12.5px] text-ink2">{formatCredits(model.priceHintMicro, { approx: true })}</td>
                      <td className="py-3.5 pr-3 pl-3">
                        <span className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => updateFavorite(model.id)}
                            aria-pressed={fav}
                            aria-label={fav ? `Убрать ${model.name} из избранного` : `Добавить ${model.name} в избранное`}
                            className={cn("k-act", fav && "text-acc")}
                          >
                            <StarBounce on={fav} size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => updateComparison(model.id, e.currentTarget.closest("tr")?.querySelector("svg"))}
                            disabled={!compared && compareIds.length >= 3}
                            aria-pressed={compared}
                            aria-label={compared ? `Убрать ${model.name} из сравнения` : `Добавить ${model.name} в сравнение`}
                            className={cn("k-tool h-8 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-40", compared && "bg-violet-soft text-violet")}
                          >
                            {compared ? "В сравнении" : "Сравнить"}
                          </button>
                          <Link href={`/app?mode=${model.modes[0]}&model=${encodeURIComponent(model.id)}`} className={cn("k-tool h-8 border border-line text-[12.5px] text-ink", model.modes.length === 0 && "pointer-events-none opacity-50")}>
                            Открыть маршрут
                          </Link>
                        </span>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {compareIds.length > 0 && (
        // счётчик сравнения всегда под рукой: модели собираются в него, клик ведёт к таблице сравнения
        <a href="#compare" data-compare-count className="sticky bottom-4 z-10 mx-auto flex h-9 w-fit items-center gap-2 rounded-full border border-violet-line bg-g1 px-4 text-[12.5px] text-violet shadow-(--shadow-float)">
          Compare ·{" "}
          <motion.span key={compareIds.length} initial={{ scale: 1.5 }} animate={{ scale: 1 }} transition={SPRING.bouncy} className="inline-block font-mono tabular-nums">
            {compareIds.length}/3
          </motion.span>
        </a>
      )}
    </>
  );
}
