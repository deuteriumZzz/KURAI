import type { Metadata } from "next";
import { Exo_2, Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// вариативный шрифт: толщина 100–900 плавно, для «набора веса» заголовков
const exo2 = Exo_2({
  variable: "--font-exo2",
  subsets: ["latin", "cyrillic"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin", "cyrillic"],
});

const jbmono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "KURAI — нейросети в одном терминале",
  description: "Текст, изображения, видео и голос от ведущих нейросетей в едином чате. Цена каждого запроса видна до отправки.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${exo2.variable} ${geist.variable} ${jbmono.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
