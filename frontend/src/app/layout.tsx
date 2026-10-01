import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Sofia_Sans_Extra_Condensed } from "next/font/google";
import "./globals.css";

// Три роли шрифта (docs/UX_PIPELINE.md → Typography): спокойный sans для чтения и
// управления, узкий дисплей для редких якорей, моно — только для значений и провенанса.
const sans = Geist({ variable: "--font-geist", subsets: ["latin", "cyrillic"] });
const cond = Sofia_Sans_Extra_Condensed({ variable: "--font-sofia-cond", subsets: ["latin", "cyrillic"], weight: "variable" });
const mono = JetBrains_Mono({ variable: "--font-jbmono", subsets: ["latin", "cyrillic"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "KURAI — нейросети в одном терминале",
  description: "Текст, изображения, видео и голос от ведущих нейросетей в едином чате. Цена каждого запроса видна до отправки.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" data-theme="dark" suppressHydrationWarning className={`${sans.variable} ${cond.variable} ${mono.variable} h-full`}>
      <head>
        {/* тема кабинета до первой отрисовки — без вспышки; при первом входе следует системе */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(location.pathname.startsWith("/app")){var t=(JSON.parse(localStorage.getItem("kurai:prefs")||"{}").theme)||"system";if(t==="system")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t}}catch(e){}`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
