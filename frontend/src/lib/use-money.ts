"use client";

import { useEffect, useState } from "react";
import { kuraiApi } from "./kurai-api";
import { convertUsd, currencyFor, formatMoney, type Rates } from "./currency";
import { usePrefs } from "./use-prefs";
import { MICRO_PER_CREDIT } from "./format";

const KEY = "kurai:fx";
const TTL = 6 * 3600_000;
let inflight: Promise<Rates | null> | null = null;

/** Курсы один раз за сессию: из sessionStorage, иначе с сервера. null — сервер не подключён или источник недоступен. */
function loadRates(): Promise<Rates | null> {
  try {
    const cached = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as { at: number; rates: Rates } | null;
    if (cached && Date.now() - cached.at < TTL) return Promise.resolve(cached.rates);
  } catch {}
  if (!kuraiApi) return Promise.resolve(null);
  inflight ??= kuraiApi
    .fx()
    .then((rates) => {
      if (rates) {
        try {
          sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), rates }));
        } catch {}
      }
      return rates;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Деньги в валюте региона. До загрузки курса и без него показываем доллар — число не выдумывается. */
export function useMoney() {
  const prefs = usePrefs();
  const [rates, setRates] = useState<Rates | null>(null);
  const [locale, setLocale] = useState<string | undefined>(undefined);
  useEffect(() => {
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- язык и курс известны только в браузере
    setLocale(navigator.language);
    void loadRates().then((r) => live && setRates(r));
    return () => {
      live = false;
    };
  }, []);
  const code = currencyFor(locale, prefs.currency, rates);
  const usd = (amount: number) => formatMoney(convertUsd(amount, code, rates), code, locale);
  return { code, ready: !!locale, local: code !== "USD", usd, micro: (m: number) => usd(m / (MICRO_PER_CREDIT * 100)) };
}
