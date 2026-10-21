import type { Metadata, Viewport } from "next";
import { Geologica, Martian_Mono, Sofia_Sans_Extra_Condensed } from "next/font/google";
import "./globals.css";

// Три роли шрифта. Geologica — текст и управление: хорошая кириллица и ось «острота» (SHRP),
// которой можно рубить концы букв в тон скошенным углам. Sofia Sans Extra Condensed — заголовки
// страниц и документов: узкий дисплей в духе HUD. Martian Mono в узкой ширине — только значения:
// цены, коды, тайминги.
const sans = Geologica({ variable: "--font-geologica", subsets: ["latin", "cyrillic"], axes: ["SHRP"] });
const cond = Sofia_Sans_Extra_Condensed({ variable: "--font-sofia-cond", subsets: ["latin", "cyrillic"], weight: "variable" });
const mono = Martian_Mono({ variable: "--font-martian", subsets: ["latin", "cyrillic"], axes: ["wdth"] });

export const metadata: Metadata = {
  title: "KURAI — нейросети в одном чате",
  description: "Сотни моделей через один чат: текст, исследования, изображения и слайды. Цена каждого запроса видна до отправки.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

// панель браузера на телефоне — цвета материала кабинета; в кабинете applyPrefs уточняет по выбранной теме
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#151515" },
    { media: "(prefers-color-scheme: light)", color: "#f1f0ec" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" data-theme="dark" suppressHydrationWarning className={`${sans.variable} ${cond.variable} ${mono.variable} h-full`}>
      <head>
        {/* тема кабинета до первой отрисовки — без вспышки; при первом входе следует системе */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(location.pathname.startsWith("/app")){var p=JSON.parse(localStorage.getItem("kurai:prefs")||"{}"),t=p.theme||"system";if(t==="system")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t;if(p.accent&&p.accent!=="lime")document.documentElement.dataset.accent=p.accent;if(p.density==="compact")document.documentElement.dataset.density="compact";if(p.calm)document.documentElement.classList.add("calm");if(p.softContrast)document.documentElement.classList.add("soft")}}catch(e){}`,
          }}
        />
      </head>
      <body className="kurai-app flex min-h-full flex-col">{children}</body>
    </html>
  );
}
