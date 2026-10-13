import type { Season } from "@/types/analysis";
import type { Product, ProductCategory, ProductSource } from "@/types/product";
import type { Swatch } from "@/types/product";
import { coupangSearchUrl } from "./affiliate";
import products from "./products.json";

/** 제품 데이터 접근 지점. 쇼핑몰 API로 바꿀 때 이 함수만 fetch로 교체한다. */
export function getProducts(season: Season, category?: ProductCategory): Product[] {
  return (products as ProductSource[])
    .filter((p) => p.seasons.includes(season) && (!category || p.category === category))
    .map((p) => ({ ...p, url: p.url ?? coupangSearchUrl(p.keyword ?? `${p.brand} ${p.name} ${p.shade}`) }));
}

/** 가상 체험용 색상 칩. 제품 id를 그대로 써서 팔레트 칩과 같은 선택 상태를 공유한다 */
export function productSwatches(season: Season, category: ProductCategory): Swatch[] {
  return getProducts(season, category).map((p) => ({ id: p.id, name: `${p.brand} ${p.name} ${p.shade}`, hex: p.hex }));
}
