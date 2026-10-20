import type { Season } from "@/types/analysis";
import type { Product, ProductCategory, ProductSource } from "@/types/product";
import type { Swatch } from "@/types/product";
import { hexToLab } from "@/features/analysis/color";
import { coupangSearchUrl } from "./affiliate";
import products from "./products.json";

/** 제품 데이터 접근 지점. 쇼핑몰 API로 바꿀 때 이 함수만 fetch로 교체한다. */
export function getProducts(season: Season, category?: ProductCategory): Product[] {
  return (products as ProductSource[])
    .filter((p) => p.seasons.includes(season) && (!category || p.category === category))
    .map(withUrl);
}

function withUrl(p: ProductSource): Product {
  return { ...p, url: p.url ?? coupangSearchUrl(p.keyword ?? `${p.brand} ${p.name} ${p.shade}`) };
}

export function productById(id: string | null): Product | null {
  const found = id ? (products as ProductSource[]).find((p) => p.id === id) : undefined;
  return found ? withUrl(found) : null;
}

/** 색이 가장 가까운(Lab 거리) 제품. 팔레트 색이나 직접 잰 색을 실제 제품으로 이어 줄 때 쓴다 */
export function nearestProduct(hex: string, category: ProductCategory): Product | null {
  const lab = hexToLab(hex);
  const dist = (p: ProductSource) => {
    const o = hexToLab(p.hex);
    return Math.hypot(lab.L - o.L, lab.a - o.a, lab.b - o.b);
  };
  const pool = (products as ProductSource[]).filter((p) => p.category === category);
  return pool.length ? withUrl(pool.reduce((a, b) => (dist(b) < dist(a) ? b : a))) : null;
}

/** 가상 체험용 색상 칩. 제품 id를 그대로 써서 팔레트 칩과 같은 선택 상태를 공유한다 */
export function productSwatches(season: Season, category: ProductCategory): Swatch[] {
  return getProducts(season, category).map((p) => ({ id: p.id, name: `${p.brand} ${p.name} ${p.shade}`, hex: p.hex, finish: p.finish }));
}
