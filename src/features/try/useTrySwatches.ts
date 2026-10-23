"use client";

import type { SwatchSection } from "@/features/lipTryOn/ColorPicker";
import { useMyShadeStore } from "@/features/myShade/store";
import { productSwatches } from "@/features/recommend/getProducts";
import { SEASON_INFO, sortSwatches } from "@/features/recommend/palettes";
import { useLipRanking } from "@/features/recommend/useLipRanking";
import { useAnalysisStore } from "@/stores/analysisStore";
import type { Swatch } from "@/types/product";

export type Part = "lip" | "blush";

/** 어울림 순위가 있으면 그 순서로 줄 세운다 */
function byRank(swatches: Swatch[], order: Map<string, number>): Swatch[] {
  return order.size ? [...swatches].sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity)) : swatches;
}

/**
 * 발라 보기에 띄울 색 묶음: 내 제품 → 고른 시즌 팔레트(내 시즌이면 세부 타입 순) → 많이 찾는 제품(립은 어울리는 순).
 * 발라 보기 패널과 크게 보기 아래 색 바가 같은 순서를 쓴다
 */
export function useTrySwatches(part: Part): SwatchSection[] {
  const result = useAnalysisStore((s) => s.result);
  const paletteSeason = useAnalysisStore((s) => s.paletteSeason);
  const mine = useMyShadeStore((s) => s.shades);
  const ranking = useLipRanking();
  if (!result) return [];
  const isLip = part === "lip";
  const shown = paletteSeason ?? result.season;
  const info = SEASON_INFO[shown];
  const order = new Map(isLip && ranking ? ranking.ranked.map((r, i) => [r.item.id, i]) : []);
  const myShades = mine.filter((m) => m.category === part);
  const palette = isLip ? info.lips : info.blushes;
  return [
    ...(myShades.length ? [{ title: "내 제품", swatches: myShades }] : []),
    { title: `${info.label} ${info.tone} 팔레트`, swatches: shown === result.season ? sortSwatches(palette, result.subtype) : palette },
    { title: isLip ? "많이 찾는 제품 · 어울리는 순" : "많이 찾는 제품", swatches: byRank(productSwatches(shown, part), order) },
  ];
}
