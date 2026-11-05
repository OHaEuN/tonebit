import type { ProductSource } from "@/types/product";
import { chroma, hexToLab } from "@/features/analysis/color";
import { hueDeg } from "./harmony";

/** 월간 베스트 순위가 이 안이면 유행 점수에 들어간다 */
const RANK_RANGE = 40;
/** 순위 몫과 키워드 몫 */
const RANK_SHARE = 0.6;

/**
 * 2026 F/W 립 키워드와 맞는지(0~1). 질감은 물광·글레이즈(촉촉)와 블러·매트(보송) 두 축이 같이 유행이고,
 * 색은 뮤트 뉴트럴(MLBB), 매트 베리, 클래식 레드 변주. 출처: 얼루어 2026-01, W코리아 2026 F/W 컬렉션, 2026-10 클라우드 립 기사
 */
export function trendKeywords(p: Pick<ProductSource, "hex" | "finish">): number {
  const lab = hexToLab(p.hex);
  const c = chroma(lab);
  const h = hueDeg(lab);
  const texture = p.finish === "glossy" ? 0.5 : p.finish === "velvet" || p.finish === "matte" ? 0.4 : 0.1;
  const mutedNeutral = c < 34 && lab.L >= 42 && lab.L <= 66;
  const berry = h < 18 && lab.L < 46 && c >= 30;
  const classicRed = h >= 18 && h <= 38 && c >= 45 && lab.L < 52;
  return texture + (mutedNeutral || berry || classicRed ? 0.5 : 0);
}

/** 0~1. 요즘 얼마나 찾는 색인지. 올리브영 2026년 9월 월간 순위 60% + 키워드 40% */
export function trendScore(p: Pick<ProductSource, "hex" | "finish" | "trendRank">): number {
  const rank = p.trendRank && p.trendRank <= RANK_RANGE ? 1 - (p.trendRank - 1) / RANK_RANGE : 0;
  return Math.min(1, RANK_SHARE * rank + (1 - RANK_SHARE) * trendKeywords(p));
}
