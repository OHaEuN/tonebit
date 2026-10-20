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
  /** 공식 색상명 기준 근사치. 실제 발색과 다를 수 있다 */
  hex: string;
  finish: Finish;
  seasons: Season[];
  keyword?: string;
  url?: string;
}

export interface Product extends ProductSource {
  url: string;
}
