"use client";

import type { SwatchSection } from "@/features/lipTryOn/ColorPicker";
import { productSwatches } from "@/features/recommend/getProducts";
import { SEASON_INFO, sortSwatches } from "@/features/recommend/palettes";
import { useAnalysisStore } from "@/stores/analysisStore";

export type Part = "lip" | "blush";

/** 발라 보기에 띄울 색: 고른 시즌 팔레트(내 시즌이면 세부 타입 순으로) + 많이 찾는 제품 */
export function useTrySwatches(part: Part): SwatchSection[] {
  const result = useAnalysisStore((s) => s.result);
  const paletteSeason = useAnalysisStore((s) => s.paletteSeason);
  if (!result) return [];
  const shown = paletteSeason ?? result.season;
  const info = SEASON_INFO[shown];
  const palette = part === "lip" ? info.lips : info.blushes;
  return [
    { title: `${info.label} ${info.tone} 팔레트`, swatches: shown === result.season ? sortSwatches(palette, result.subtype) : palette },
    { title: "많이 찾는 제품", swatches: productSwatches(shown, part) },
  ];
}
