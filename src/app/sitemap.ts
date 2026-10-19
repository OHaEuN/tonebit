import type { MetadataRoute } from "next";
import { TONE_SLUGS } from "@/features/recommend/palettes";
import { resultPath } from "@/features/share/resultUrl";

/** 검색엔진에 알릴 페이지. 시즌만 있는 옛 링크(/r/spring)는 canonical로 트루 타입에 합쳐지므로 넣지 않는다 */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN || "http://localhost:3000";
  const url = (path: string) => `${origin}${path}`;
  return [
    { url: url("/"), priority: 1 },
    { url: url("/try"), priority: 0.9 },
    ...TONE_SLUGS.map((tone) => ({ url: url(resultPath(tone)), priority: 0.8 })),
    { url: url("/privacy"), priority: 0.2 },
  ];
}
