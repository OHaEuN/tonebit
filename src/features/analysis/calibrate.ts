import type { Season } from "@/types/analysis";
import { seasonFor, type Thresholds } from "./tone";

/** 재보정에 쓰는 진단 한 건: 측정값과 전문가 시즌 */
export interface LabeledSample {
  hue: number;
  ita: number;
  chroma: number;
  expert: Season;
}

export interface CalibrationPolicy {
  /** 이보다 적으면 바꾸지 않는다 */
  minSamples: number;
  /** 교차검증 일치율이 지금 기준보다 이만큼(비율) 넘게 올라야 바꾼다 */
  minGain: number;
  /** 한 번에 움직일 수 있는 최대 폭. 표본 치우침으로 크게 튀지 않게 */
  maxStep: Thresholds;
  folds: number;
}

export const DEFAULT_POLICY: CalibrationPolicy = {
  minSamples: 50,
  minGain: 0.02,
  maxStep: { hueCenter: 3, itaLightMin: 8, chromaClearMin: 3 },
  folds: 5,
};

/** 탐색 범위와 간격 */
const GRID: Record<keyof Thresholds, { lo: number; hi: number; step: number }> = {
  hueCenter: { lo: 35, hi: 65, step: 0.25 },
  itaLightMin: { lo: -20, hi: 50, step: 0.5 },
  chromaClearMin: { lo: 12, hi: 36, step: 0.5 },
};
const KEYS = Object.keys(GRID) as (keyof Thresholds)[];

export function accuracy(samples: LabeledSample[], t: Thresholds): number {
  if (!samples.length) return 0;
  let hit = 0;
  for (const s of samples) if (seasonFor(s.hue, s.ita, s.chroma, t) === s.expert) hit++;
  return hit / samples.length;
}

const clampStep = (v: number, from: number, step: number) => Math.min(from + step, Math.max(from - step, v));

/**
 * 일치율이 가장 높은 기준값. 한 축씩 번갈아 훑는 좌표 하강(3바퀴). 시즌은 웜/쿨(hue)과 명/암(ITA)으로 거의 정해지고
 * 채도는 뉴트럴일 때만 쓰여 축끼리 얽힘이 약해서 이걸로 충분하다. 동점이면 지금 값에 가까운 쪽(덜 움직이는 쪽)
 */
export function fitThresholds(samples: LabeledSample[], from: Thresholds, maxStep: Thresholds): Thresholds {
  let best = { ...from };
  for (let round = 0; round < 3; round++) {
    for (const k of KEYS) {
      const { lo, hi, step } = GRID[k];
      let bestAcc = -1;
      let bestDist = Infinity;
      let bestV = best[k];
      for (let v = lo; v <= hi + 1e-9; v += step) {
        const cand = clampStep(v, from[k], maxStep[k]);
        const acc = accuracy(samples, { ...best, [k]: cand });
        const dist = Math.abs(cand - from[k]);
        if (acc > bestAcc + 1e-12 || (Math.abs(acc - bestAcc) <= 1e-12 && dist < bestDist)) {
          bestAcc = acc;
          bestDist = dist;
          bestV = cand;
        }
      }
      best = { ...best, [k]: Math.round(bestV * 100) / 100 };
    }
  }
  return best;
}

/** 표본을 섞지 않고 번호 순으로 나눈다(같은 입력이면 같은 결과). k번째 묶음이 시험용 */
function folds<T>(xs: T[], k: number): { train: T[]; test: T[] }[] {
  return Array.from({ length: k }, (_, f) => ({ train: xs.filter((_, i) => i % k !== f), test: xs.filter((_, i) => i % k === f) }));
}

export interface CalibrationReport {
  n: number;
  current: Thresholds;
  currentAccuracy: number;
  /** 기준값을 맞추는 절차 자체의 교차검증 일치율(맞춘 데이터로 채점하지 않는다) */
  cvAccuracy: number;
  proposed: Thresholds;
  apply: boolean;
  reason: string;
  /** 전문가 시즌(행) × 제안 기준 판정(열) 건수 */
  confusion: Record<Season, Record<Season, number>>;
}

const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

/**
 * 진단 데이터로 기준값을 다시 맞출지 정한다. 지금 기준은 이 데이터로 맞춘 게 아니라 그대로 채점하고,
 * 새 기준은 교차검증으로 채점해 둘을 공정하게 비교한다. 표본이 적거나 이득이 작으면 바꾸지 않는다
 */
export function calibrate(samples: LabeledSample[], current: Thresholds, policy: CalibrationPolicy = DEFAULT_POLICY): CalibrationReport {
  const n = samples.length;
  const currentAccuracy = accuracy(samples, current);
  const proposed = fitThresholds(samples, current, policy.maxStep);
  let cvHit = 0;
  if (n >= policy.folds) {
    for (const { train, test } of folds(samples, policy.folds)) cvHit += accuracy(test, fitThresholds(train, current, policy.maxStep)) * test.length;
  }
  const cvAccuracy = n >= policy.folds ? cvHit / n : 0;
  const confusion = Object.fromEntries(SEASONS.map((e) => [e, Object.fromEntries(SEASONS.map((p) => [p, 0]))])) as CalibrationReport["confusion"];
  for (const s of samples) confusion[s.expert][seasonFor(s.hue, s.ita, s.chroma, proposed)]++;

  let apply = false;
  let reason: string;
  if (n < policy.minSamples) reason = `표본 ${n}건 < ${policy.minSamples}건이라 그대로 둠`;
  else if (cvAccuracy - currentAccuracy < policy.minGain)
    reason = `교차검증 ${(cvAccuracy * 100).toFixed(1)}% vs 지금 ${(currentAccuracy * 100).toFixed(1)}%, 이득이 ${policy.minGain * 100}%p 미만이라 그대로 둠`;
  else {
    apply = true;
    reason = `교차검증 ${(cvAccuracy * 100).toFixed(1)}% > 지금 ${(currentAccuracy * 100).toFixed(1)}%`;
  }
  return { n, current, currentAccuracy, cvAccuracy, proposed, apply, reason, confusion };
}
