"use client";

import { useMemo } from "react";
import type { Season } from "@/types/analysis";
import type { ProductSource } from "@/types/product";
import { seasonOdds } from "@/features/analysis/tone";
import { useMyShadeStore, type MyShade } from "@/features/myShade/store";
import { useAnalysisStore } from "@/stores/analysisStore";
import { rankLips, type HarmonyItem, type RankedItem } from "./harmony";
import { nearestSeason, SEASON_INFO, SEASONS } from "./palettes";
import products from "./products.json";

export interface LipCandidate extends HarmonyItem {
  kind: "product" | "palette" | "mine";
}

/** 순위에 올릴 립: 제품, 시즌 팔레트 색, 이용자가 잰 자기 제품 */
function lipCandidates(mine: MyShade[]): LipCandidate[] {
  const fromProducts = (products as ProductSource[])
    .filter((p) => p.category === "lip")
    .map((p): LipCandidate => ({ id: p.id, name: `${p.brand} ${p.name} ${p.shade}`, hex: p.hex, finish: p.finish, seasons: p.seasons, kind: "product" }));
  const fromPalettes = SEASONS.flatMap((s) => SEASON_INFO[s].lips.map((l): LipCandidate => ({ ...l, seasons: [s], kind: "palette" })));
  const fromMine = mine
    .filter((m) => m.category === "lip")
    .map((m): LipCandidate => ({ id: m.id, name: m.name, hex: m.hex, seasons: [nearestSeason(m.hex, "lips")], kind: "mine" }));
  return [...fromProducts, ...fromPalettes, ...fromMine];
}

export interface LipRanking {
  odds: Record<Season, number>;
  ranked: RankedItem<LipCandidate>[];
}

/** 지금 보고 있는 결과(피부·입술·시즌 확률)로 낸 립 순위. 결과가 없으면 null */
export function useLipRanking(): LipRanking | null {
  const result = useAnalysisStore((s) => s.result);
  const mine = useMyShadeStore((s) => s.shades);
  return useMemo(() => {
    if (!result) return null;
    const odds = seasonOdds(result.lab, result.reference ?? "none");
    return { odds, ranked: rankLips(result.lab, result.lip, odds, lipCandidates(mine)) };
  }, [result, mine]);
}
