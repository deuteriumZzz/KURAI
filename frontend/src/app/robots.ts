import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/app", "/kit", "/verify", "/reset", "/s/"] },
    sitemap: "https://kurai.ai/sitemap.xml",
  };
}
