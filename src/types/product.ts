import type { Season } from "./analysis";

export interface Swatch {
  id: string;
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  brand: string;
  name: string;
  shade: string;
  hex: string;
  finish: "matte" | "glossy" | "velvet";
  seasons: Season[];
  /** 제휴 링크 placeholder. 실제 링크로 교체 시 여기만 바뀐다. */
  url: string;
}
