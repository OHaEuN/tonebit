"use client";

import { useMemo, useState } from "react";
import { track } from "@/features/analytics/track";
import { useAnalysisStore } from "@/stores/analysisStore";
import { depthRounds, drapeSeason, pickedWarm, ROUNDS_PER_AXIS, undertoneRounds, type DrapeSide } from "./drape";

/**
 * 셀프 드레이핑 진행 상태. 라운드마다 두 색 중 하나를 미리 발라 보고(립 선택과 같은 상태) 더 나은 쪽을 고른다.
 * 웜/쿨 세 번을 고르면 그 쪽 안에서 라이트/딥 세 번을 묻는다
 */
export function useDrapeSession() {
  const selectLip = useAnalysisStore((s) => s.selectLip);
  const [picks, setPicks] = useState<DrapeSide[]>([]);
  const [preview, setPreview] = useState<0 | 1>(0);

  const round = useMemo(() => {
    if (picks.length < ROUNDS_PER_AXIS) return undertoneRounds()[picks.length];
    const depth = depthRounds(pickedWarm(picks.slice(0, ROUNDS_PER_AXIS)));
    return depth[picks.length - ROUNDS_PER_AXIS] ?? null;
  }, [picks]);

  const show = (i: 0 | 1) => {
    if (!round) return;
    setPreview(i);
    selectLip(round[i].swatch.id);
  };

  /** 지금 보고 있는 색을 고르고 다음 라운드의 첫 색을 바로 발라 둔다 */
  const choose = () => {
    if (!round) return;
    const next = [...picks, round[preview].side];
    setPicks(next);
    const done = drapeSeason(next);
    if (done) track({ name: "drape-done", season: done, same: done === useAnalysisStore.getState().result?.season });
    setPreview(0);
    const upcoming = next.length < ROUNDS_PER_AXIS ? undertoneRounds()[next.length] : depthRounds(pickedWarm(next.slice(0, ROUNDS_PER_AXIS)))[next.length - ROUNDS_PER_AXIS];
    selectLip(upcoming ? upcoming[0].swatch.id : null);
  };

  const start = () => {
    setPicks([]);
    setPreview(0);
    selectLip(undertoneRounds()[0][0].swatch.id);
  };

  return { round, preview, show, choose, start, step: picks.length, total: ROUNDS_PER_AXIS * 2, season: drapeSeason(picks) };
}
