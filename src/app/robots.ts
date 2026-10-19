import type { MetadataRoute } from "next";

/** 피드백 API와 분석 스크립트 프록시는 색인할 내용이 없다 */
export default function robots(): MetadataRoute.Robots {
  const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN || "http://localhost:3000";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/stats/"] },
    sitemap: `${origin}/sitemap.xml`,
  };
}
