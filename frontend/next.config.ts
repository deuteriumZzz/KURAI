import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // корень проекта — эта папка (иначе Turbopack цепляет lock-файлы из родительских каталогов)
  turbopack: { root: path.join(__dirname) },
  // Локальный кабинет открывается в приложении по 127.0.0.1, а dev-сервер
  // регистрируется как localhost. Без явного разрешения Next блокирует HMR
  // и клиентская гидрация не получает свой рантайм: интерфейс виден, но кнопки
  // не реагируют. Это действует только в режиме разработки.
  allowedDevOrigins: ["127.0.0.1"],
  // браузеры и боты по привычке просят /favicon.ico — отдаём ту же SVG-иконку, что объявлена в <head>
  rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon.svg" }];
  },
};

export default nextConfig;
