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
    <p role="status" className="rounded-2xl bg-accent-soft px-4 py-2.5 text-sm">
      어울림 <strong>{score}점</strong>
      <span className="text-muted">
        {" "}
        · 전체 {ranking.ranked.length}개 중 {index + 1}위 · {harmonyNote(harmony)}
      </span>
    </p>
  );
}
