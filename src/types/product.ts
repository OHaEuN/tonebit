import type { Season } from "./analysis";

export interface Swatch {
  id: string;
  name: string;
  hex: string;
}

/** products.json 한 줄. url이 있으면 그 링크, 없으면 keyword로 쿠팡 검색 제휴 링크를 만든다 */
export interface ProductSource {
  id: string;
  brand?: string;
  name: string;
  shade: string;
  hex: string;
  finish: "matte" | "glossy" | "velvet";
  seasons: Season[];
  keyword?: string;
  url?: string;
}

export interface Product extends ProductSource {
  url: string;
}
