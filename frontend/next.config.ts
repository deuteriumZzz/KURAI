import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // корень проекта — эта папка (иначе Turbopack цепляет lock-файлы из родительских каталогов)
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
