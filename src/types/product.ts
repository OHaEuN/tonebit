import type { Season } from "./analysis";

export interface Swatch {
  id: string;
  name: string;
  hex: string;
  /** 제형을 알면 발색 칩의 광택을 맞춘다 */
  finish?: Finish;
}

export type ProductCategory = "lip" | "blush";
export type Finish = "matte" | "glossy" | "velvet" | "cream" | "powder" | "liquid";

/** products.json 한 줄. url이 있으면 그 링크, 없으면 keyword로 쿠팡 검색 제휴 링크를 만든다 */
export interface ProductSource {
  id: string;
  category: ProductCategory;
  brand: string;
  name: string;
  shade: string;
  /** 브랜드 공식 색상 칩·스와치에서 잰 값(hexSource가 있을 때). 없으면 공식 색상 설명을 보고 적은 근사치 */
  hex: string;
  /** hex를 어디서 어떻게 쟀는지. 없으면 근사치 */
  hexSource?: HexSource;
  finish: Finish;
  seasons: Season[];
  keyword?: string;
  url?: string;
  /** 정가 기준 대략적인 가격대. 판매처·시기마다 다르다 */
  priceTier: PriceTier;
  /** 제형·마무리감 한 줄. AI 상담이 설명과 검색에 쓴다 */
  note: string;
  /** 왜 인기 제품인지 한 줄 (예: 2025 올리브영 어워즈 립 1위). 목록 순서가 인기 순이다 */
  best?: string;
  /** 이 라인의 올리브영 립 메이크업 월간 베스트 순위(2026년 9월, 100위 안). 유행 항에 쓴다 */
  trendRank?: number;
}

export type PriceTier = "under20k" | "20k-40k" | "over40k";

export interface HexSource {
  /** official-chip: 브랜드 공식 색상 칩 이미지 평균, official-swatch: 공식 발색 사진, blog-swatch: 리뷰 발색 사진 */
  method: "official-chip" | "official-swatch" | "blog-swatch";
  url: string;
  confidence: "high" | "medium" | "low";
}

export interface Product extends ProductSource {
  url: string;
}
