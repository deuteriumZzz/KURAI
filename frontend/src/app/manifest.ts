import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KURAI — нейросети в одном чате",
    short_name: "KURAI",
    description: "Сотни моделей через один чат. Цена каждого запроса видна до отправки.",
    start_url: "/app",
    display: "standalone",
    background_color: "#151515",
    theme_color: "#151515",
    lang: "ru",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      { src: "/maskable-icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
