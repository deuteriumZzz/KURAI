"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Bookmark } from "lucide-react";
import { Label } from "@/components/fx/primitives";
import { formatCredits } from "@/lib/format";
import { modeById } from "@/lib/modes";
import { kuraiApi, type KuraiRecipe } from "@/lib/kurai-api";

/** Connected recipes lead with the member's verified routes, above public starters. */
export function SavedRecipes() {
  const [recipes, setRecipes] = useState<KuraiRecipe[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "hidden">(kuraiApi ? "loading" : "hidden");

  useEffect(() => {
    if (!kuraiApi) return;
    let active = true;
    void kuraiApi.recipes().then(
      (items) => { if (active) { setRecipes(items); setState("ready"); } },
      () => { if (active) setState("hidden"); },
    );
    return () => { active = false; };
  }, []);

  if (state === "hidden" || (state === "ready" && recipes.length === 0)) return null;
  return (
    <section aria-label="Мои рецепты" className="border-y border-line py-5">
      <div className="mb-3 flex items-baseline justify-between gap-3"><h2 className="text-[16px] text-ink">Мои рабочие маршруты</h2><Label>{state === "loading" ? "загружаю" : `${recipes.length} сохранено`}</Label></div>
      {state === "loading" ? <div className="h-20 animate-pulse bg-s1" /> : (
        <ul className="grid gap-px bg-line sm:grid-cols-2">
          {recipes.slice(0, 6).map((recipe) => (
            <li key={recipe.id} className="bg-g1">
              <Link href={`/app?mode=${recipe.mode}&model=${encodeURIComponent(recipe.model)}&prompt=${encodeURIComponent(recipe.prompt)}`} className="group flex min-h-28 flex-col gap-2 p-3.5 transition-colors duration-(--dur-fast) hover:bg-s2">
                <span className="flex items-center justify-between gap-3"><span className="truncate text-[14px] text-ink">{recipe.title}</span><ArrowUpRight size={14} strokeWidth={1.5} className="shrink-0 text-ink3 group-hover:text-acc" /></span>
                <span className="line-clamp-2 text-[12.5px] leading-relaxed text-ink2">{recipe.prompt}</span>
                <span className="mt-auto flex items-center gap-2"><Bookmark size={12} strokeWidth={1.5} className="text-violet" /><Label>{modeById(recipe.mode).label} · {recipe.model || "Авто"} · {formatCredits(recipe.sourceCostMicro)}</Label></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
