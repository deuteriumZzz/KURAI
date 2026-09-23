import type { MetadataRoute } from "next";

const BASE = "https://kurai.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/pricing", "/status", "/changelog", "/terms", "/privacy", "/offer", "/login", "/register"].map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path === "" || path === "/changelog" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
