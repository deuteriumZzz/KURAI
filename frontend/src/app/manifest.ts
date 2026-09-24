import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KURAI — нейросети в одном терминале",
    short_name: "KURAI",
    description: "Текст, изображения, видео и голос от ведущих нейросетей в едином чате.",
    start_url: "/app",
    display: "standalone",
    background_color: "#070A0E",
    theme_color: "#070A0E",
    lang: "ru",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
