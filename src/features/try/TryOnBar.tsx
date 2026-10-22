"use client";

import type { ProductCategory } from "@/types/product";
import { BUTTON } from "@/components/styles";
import { resolveSwatch, useMyShadeStore } from "@/features/myShade/store";
import { nearestProduct, productById } from "@/features/recommend/getProducts";
import { useLipRanking } from "@/features/recommend/useLipRanking";
import { SwatchSmear } from "@/features/swatch/SwatchSmear";
import { seedOf, smearFinish } from "@/features/swatch/smear";

interface TryOnBarProps {
  part: ProductCategory;
  selectedId: string | null;
}

/**
 * 발라 보기 화면 아래 고정 바: 지금 바른 색과 그 색의 실제 제품. 제품이면 바로 쿠팡으로,
 * 팔레트 색·내 제품이면 색이 가장 가까운 제품으로 잇는다. 사진 위에는 조작만 남기고 정보는 여기에 모은다
 */
export function TryOnBar({ part, selectedId }: TryOnBarProps) {
  useMyShadeStore((s) => s.shades);
  const ranking = useLipRanking();
  const swatch = resolveSwatch(part === "lip" ? "lips" : "blushes", selectedId);
  if (!swatch) return null;

  const own = productById(selectedId);
  const product = own ?? nearestProduct(swatch.hex, part);
  const index = part === "lip" && ranking ? ranking.ranked.findIndex((r) => r.item.id === selectedId) : -1;
  const score = index >= 0 ? ranking!.ranked[index].score : null;

  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-[12px] md:border md:px-3">
      <SwatchSmear color={swatch.hex} width={40} height={40} finish={smearFinish(swatch.finish ?? own?.finish)} seed={seedOf(swatch.id)} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium">{swatch.name}</p>
        <p className="truncate text-[12px] text-muted">
          {score !== null && `어울림 ${score}점 · `}
          {own ? "이 제품" : product ? `비슷한 제품: ${product.brand} ${product.shade}` : "비슷한 제품이 아직 없어요"}
        </p>
      </div>
      {product && (
        <a
          href={product.url}
          target="_blank"
          rel="sponsored noopener"
          data-umami-event="product-click"
          data-umami-event-id={product.id}
          className={`${BUTTON.small} bg-fg text-white hover:opacity-85`}
        >
          {own ? "쿠팡에서 보기" : "비슷한 제품"}
        </a>
      )}
    </div>
  );
}
