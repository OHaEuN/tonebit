"use client";

import { useMemo, useState } from "react";
import type { Season } from "@/types/analysis";
import { track } from "@/features/analytics/track";
import { useAnalysisStore } from "@/stores/analysisStore";
import { depthRounds, drapeResult, pickedWarm, ROUNDS_PER_AXIS, undertoneRounds, type DrapePick, type DrapeRound } from "./drape";

/** n번째 라운드. 웜/쿨 세 번 뒤에는 고른 쪽 안에서 라이트/딥을 묻는다 */
function roundAt(picks: DrapePick[], measured: Season): DrapeRound | null {
  if (picks.length < ROUNDS_PER_AXIS) return undertoneRounds()[picks.length];
  return depthRounds(pickedWarm(picks, measured))[picks.length - ROUNDS_PER_AXIS] ?? null;
}

/**
 * 셀프 드레이핑 진행 상태. 라운드마다 두 색 중 하나를 미리 발라 보고(립 선택과 같은 상태) 더 나은 쪽을 고른다.
 * 비슷해 보이면 "비슷해요"로 넘기고, 비긴 축은 측정 결과를 따른다
 */
export function useDrapeSession() {
  const selectLip = useAnalysisStore((s) => s.selectLip);
  const measured = useAnalysisStore((s) => s.result?.season ?? "spring");
  const [picks, setPicks] = useState<DrapePick[]>([]);
  const [preview, setPreview] = useState<0 | 1>(0);

  const round = useMemo(() => roundAt(picks, measured), [picks, measured]);

  const show = (i: 0 | 1) => {
    if (!round) return;
    setPreview(i);
    selectLip(round[i].swatch.id);
  };

  /** 지금 보고 있는 색(또는 "비슷해요")을 고르고 다음 라운드의 첫 색을 바로 발라 둔다 */
  const choose = (same = false) => {
    if (!round) return;
    const next: DrapePick[] = [...picks, same ? "same" : round[preview].side];
    setPicks(next);
    setPreview(0);
    const done = drapeResult(next, measured);
    if (done) track({ name: "drape-done", season: done.season, same: done.season === measured });
    selectLip(roundAt(next, measured)?.[0].swatch.id ?? null);
  };

  const start = () => {
    setPicks([]);
    setPreview(0);
    selectLip(undertoneRounds()[0][0].swatch.id);
  };

  return { round, preview, show, choose, start, step: picks.length, total: ROUNDS_PER_AXIS * 2, result: drapeResult(picks, measured), measured };
}
