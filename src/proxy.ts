import { NextResponse, type NextRequest } from "next/server";
import { SEASON_SUBTYPES } from "@/features/analysis/tone";
import type { Season } from "@/types/analysis";

/** "spring-light"와 시즌만 있는 "spring". palettes.ts의 parseTone과 같은 규칙 */
const VALID_TONES = new Set(
  (Object.keys(SEASON_SUBTYPES) as Season[]).flatMap((season) => [season, ...SEASON_SUBTYPES[season].map((sub) => `${season}-${sub}`)]),
);

/**
 * /r/[tone]은 부분 프리렌더라 셸이 먼저 스트리밍되고, 페이지의 notFound()는 200 상태로 나간다.
 * 없는 톤은 렌더 전에 여기서 걸러 404 상태를 지킨다
 */
export function proxy(request: NextRequest) {
  const tone = request.nextUrl.pathname.split("/")[2];
  if (VALID_TONES.has(tone)) return NextResponse.next();
  return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
}

export const config = {
  matcher: ["/r/:tone", "/r/:tone/opengraph-image"],
};
