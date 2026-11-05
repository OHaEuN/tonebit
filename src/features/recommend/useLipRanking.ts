"use client";

import { useMemo } from "react";
import type { Season } from "@/types/analysis";
import type { ProductSource } from "@/types/product";
import { seasonOdds } from "@/features/analysis/tone";
import { useMyShadeStore, type MyShade } from "@/features/myShade/store";
import { useAnalysisStore } from "@/stores/analysisStore";
import { rankLips, type HarmonyItem, type RankedItem } from "./harmony";
import { nearestSeason, SEASON_INFO, SEASONS } from "./palettes";
import { useTasteStore } from "./tasteStore";
import products from "./products.json";
import { trendScore } from "./trend";

export interface LipCandidate extends HarmonyItem {
  kind: "product" | "palette" | "mine";
  /** 제품이면 브랜드와 라인·색 이름을 따로 보여 준다 */
  brand?: string;
  shade?: string;
  /** 제품 라인 이름(예: 더 쥬시 래스팅 틴트). 같은 라인끼리 묶을 때 쓴다 */
  line?: string;
}

/** 순위에 올릴 립: 제품, 시즌 팔레트 색, 이용자가 잰 자기 제품 */
function lipCandidates(mine: MyShade[]): LipCandidate[] {
  const fromProducts = (products as ProductSource[])
    .filter((p) => p.category === "lip")
    .map(
      (p): LipCandidate => ({
        id: p.id,
        name: `${p.brand} ${p.name} ${p.shade}`,
        brand: p.brand,
        shade: `${p.name} ${p.shade}`,
        line: p.name,
        hex: p.hex,
        finish: p.finish,
        seasons: p.seasons,
        trend: trendScore(p),
        kind: "product",
      }),
    );
  const fromPalettes = SEASONS.flatMap((s) => SEASON_INFO[s].lips.map((l): LipCandidate => ({ ...l, seasons: [s], kind: "palette" })));
  const fromMine = mine
    .filter((m) => m.category === "lip")
    .map((m): LipCandidate => ({ id: m.id, name: m.name, hex: m.hex, seasons: [nearestSeason(m.hex, "lips")], kind: "mine" }));
  return [...fromProducts, ...fromPalettes, ...fromMine];
}

/** 같은 라인(브랜드·제품명)은 이만큼까지만 순위에 보인다. 인기 라인의 색 서너 개가 상위를 다 차지하면 고를 폭이 줄어서 */
export const MAX_PER_LINE = 2;

/** 같은 라인이 maxPerLine개를 넘으면 뒤의 것을 뺀다. 점수 순서는 그대로. keep(내가 고른 1등)은 늘 남긴다 */
export function diversifyByLine<T extends { item: LipCandidate }>(ranked: T[], keep: string | null = null, maxPerLine = MAX_PER_LINE): T[] {
  const seen = new Map<string, number>();
  return ranked.filter(({ item }) => {
    if (item.kind !== "product") return true;
    const line = `${item.brand} ${item.line}`;
    const n = seen.get(line) ?? 0;
    seen.set(line, n + 1);
    return item.id === keep || n < maxPerLine;
  });
}

export interface LipRanking {
  odds: Record<Season, number>;
  ranked: RankedItem<LipCandidate>[];
}

/** 지금 보고 있는 결과(피부·입술·시즌 확률·세부 타입)와 취향으로 낸 립 순위. 결과가 없으면 null */
export function useLipRanking(): LipRanking | null {
  const result = useAnalysisStore((s) => s.result);
  const mine = useMyShadeStore((s) => s.shades);
  const taste = useTasteStore((s) => s.taste);
  const weights = useTasteStore((s) => s.weights);
  return useMemo(() => {
    if (!result) return null;
    const odds = seasonOdds(result.lab, result.reference ?? "none");
    return { odds, ranked: rankLips(result.lab, result.lip, odds, lipCandidates(mine), { brow: result.brow, subtype: result.subtype, taste, weights }) };
  }, [result, mine, taste, weights]);
}
