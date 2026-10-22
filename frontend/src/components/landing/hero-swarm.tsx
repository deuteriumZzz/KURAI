"use client";

import { useEffect, useRef } from "react";
import { useCalm } from "@/lib/use-calm";

/**
 * Первый экран: названия провайдеров из живого каталога слетаются в «Авто» — один раз, когда собрался заголовок.
 * Когда долетело последнее, «Авто» загорается, а точки фона стягиваются к нему, как при отправке в кабинете.
 * В спокойном режиме и при «уменьшить движение» ничего не летит.
 */
export function HeroSwarm({ names }: { names: string[] }) {
  const calm = useCalm();
  const ref = useRef<HTMLDivElement>(null);
  const list = names.join("\n");

  useEffect(() => {
    const layer = ref.current;
    const chip = document.getElementById("k-auto-chip");
    const box = document.getElementById("composer-input")?.closest("form");
    const title = layer?.parentElement?.querySelector("h1");
    if (calm || !list || !layer || !chip || !box || !title) return;
    let live = true;
    let timer = 0;

    const run = () => {
      const hr = layer.getBoundingClientRect();
      const rel = (r: DOMRect) => ({ x: r.left - hr.left, y: r.top - hr.top, w: r.width, h: r.height });
      const b = rel(box.getBoundingClientRect());
      const t = rel(title.getBoundingClientRect());
      const side = (hr.width - Math.max(t.w, b.w)) / 2;
      // по бокам от заголовка, если есть место; на телефоне — один ряд над полем, чтобы не закрывать подсказку в нём
      const wide = side > 200;
      const all = list.split("\n").slice(0, wide ? 16 : 4);
      const half = Math.ceil(all.length / 2);

      const items = all.map((name, i) => {
        const el = document.createElement("span");
        el.textContent = name;
        layer.appendChild(el);
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const left = i % 2 === 0;
        const k = Math.floor(i / 2);
        const m = left ? half : all.length - half;
        let x: number;
        let y: number;
        if (wide) {
          y = t.y - 10 + ((k + 0.5) / m) * (b.y + b.h - t.y + 10) + (Math.random() - 0.5) * 18;
          const band = side - w - 48;
          x = left ? 24 + Math.random() * band : hr.width - 24 - w - Math.random() * band;
        } else {
          y = b.y - h - 6;
          x = b.x + ((i + 0.5) * b.w) / all.length - w / 2;
        }
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        const s = 0.85 + Math.random() * 0.25;
        const o = 0.6 + Math.random() * 0.35;
        el.animate(
          [
            { opacity: 0, filter: "blur(8px)", transform: `translateY(10px) scale(${s})` },
            { opacity: o, filter: "blur(0px)", transform: `translateY(0) scale(${s})` },
          ],
          { duration: 600, delay: Math.random() * 400, easing: "cubic-bezier(.2,.7,.2,1)", fill: "both" },
        );
        return { el, x, y, w, h, s, o };
      });

      timer = window.setTimeout(() => {
        const hr2 = layer.getBoundingClientRect();
        const cr = chip.getBoundingClientRect();
        const tx = cr.left - hr2.left + cr.width / 2;
        const ty = cr.top - hr2.top + cr.height / 2;
        let left = items.length;
        items
          .map((n) => ({ n, r: Math.random() }))
          .sort((a, z) => a.r - z.r)
          .forEach(({ n }, j) => {
            const dx = tx - (n.x + n.w / 2);
            const dy = ty - (n.y + n.h / 2);
            const fly = n.el.animate(
              [
                { opacity: n.o, transform: `translate(0,0) scale(${n.s})`, color: "var(--color-ink2)" },
                { opacity: 1, color: "var(--color-acc)", offset: 0.55 },
                { opacity: 0, transform: `translate(${dx}px,${dy}px) scale(.15)`, color: "var(--color-acc)" },
              ],
              { duration: 760, delay: j * 55, easing: "cubic-bezier(.55,0,.85,.25)", fill: "forwards" },
            );
            fly.onfinish = () => {
              n.el.remove();
              chip.animate([{ boxShadow: "0 0 0 0 rgb(216 236 152 / .55)" }, { boxShadow: "0 0 0 10px rgb(216 236 152 / 0)" }], { duration: 420 });
              if (--left > 0 || !live) return;
              chip.dataset.lit = "";
              const r = chip.getBoundingClientRect();
              window.dispatchEvent(new CustomEvent("kurai:sent", { detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }));
            };
          });
      }, 1300);
    };

    // ждём, пока заголовок соберётся: от его итоговой ширины зависят места подписей
    const onReady = () => live && run();
    window.addEventListener("kurai:hero-ready", onReady, { once: true });
    return () => {
      live = false;
      window.removeEventListener("kurai:hero-ready", onReady);
      clearTimeout(timer);
      layer.replaceChildren();
    };
  }, [calm, list]);

  return <div ref={ref} aria-hidden="true" className="k-swarm" />;
}
