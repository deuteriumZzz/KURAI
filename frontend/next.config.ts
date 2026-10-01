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
};

export default nextConfig;
