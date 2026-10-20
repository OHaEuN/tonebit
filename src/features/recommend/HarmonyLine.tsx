"use client";

import { harmonyNote } from "./harmony";
import { useLipRanking } from "./useLipRanking";

interface HarmonyLineProps {
  lipId: string | null;
}

/** 발라 보는 립의 어울림 점수와 전체 순위 */
export function HarmonyLine({ lipId }: HarmonyLineProps) {
  const ranking = useLipRanking();
  const index = ranking && lipId ? ranking.ranked.findIndex((r) => r.item.id === lipId) : -1;
  if (!ranking || index < 0) return null;
  const { harmony, score } = ranking.ranked[index];
  return (
    <p role="status" className="border-l-2 border-fg pl-3 text-sm">
      어울림 <strong className="font-semibold">{score}점</strong>
      <span className="text-muted">
        {" "}
        · 전체 {ranking.ranked.length}개 중 {index + 1}위 · {harmonyNote(harmony)}
      </span>
    </p>
  );
}
