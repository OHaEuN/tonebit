import type { Season } from "@/types/analysis";
import type { Product, ProductSource } from "@/types/product";
import { coupangSearchUrl } from "./affiliate";
import products from "./products.json";

/** 제품 데이터 접근 지점. 쇼핑몰 API로 바꿀 때 이 함수만 fetch로 교체한다. */
export function getProducts(season: Season): Product[] {
  return (products as ProductSource[])
    .filter((p) => p.seasons.includes(season))
    .map((p) => ({ ...p, url: p.url ?? coupangSearchUrl(p.keyword ?? `${p.shade} ${p.name}`) }));
}
