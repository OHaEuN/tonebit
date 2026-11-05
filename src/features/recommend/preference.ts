/** 립 취향. 질문 두 개의 답과, 둘 중 고르기에서 모인 선택으로 어울림 가중치를 그 사람에게 맞춘다 */

/** 원하는 느낌. Wu 2024(립 20색 × 인상 23개)의 세 인상 요인(세련·귀여움·매력)에 대응 */
export type Feel = "natural" | "vivid" | "bold";
/** 좋아하는 질감. 2026 F/W의 두 축: 물광·글레이즈(촉촉)와 블러·매트(보송) */
export type Texture = "glossy" | "blur" | "any";

export interface Taste {
  feel?: Feel;
  texture?: Texture;
}

export const FEEL_LABEL: Record<Feel, { title: string; body: string }> = {
  natural: { title: "자연스럽고 세련된", body: "내 입술색 같은 MLBB, 차분한 색" },
  vivid: { title: "화사하고 생기 있는", body: "밝고 맑은 핑크·코랄" },
  bold: { title: "또렷하고 매혹적인", body: "진하고 붉은 레드·베리" },
};

export const TEXTURE_LABEL: Record<Texture, { title: string; body: string }> = {
  glossy: { title: "촉촉하게 반짝이는", body: "글로스·시럽·물광 틴트" },
  blur: { title: "보송하게 번지는", body: "블러·벨벳·매트" },
  any: { title: "상관없어요", body: "질감은 점수에 안 넣어요" },
};

export const AXES = [
  ["lightness", "밝기 대비"],
  ["undertone", "색 방향"],
  ["redness", "혈색"],
  ["chroma", "선명도"],
  ["harmony", "색 조화"],
  ["fit", "톤 팔레트"],
  ["trend", "유행"],
  ["impression", "인상"],
  ["texture", "질감"],
  ["teeth", "치아"],
] as const;
export type AxisKey = (typeof AXES)[number][0];
export type AxisVector = Record<AxisKey, number>;
export const AXIS_LABEL: Record<AxisKey, string> = Object.fromEntries(AXES) as Record<AxisKey, string>;

/**
 * 출발 가중치. 문헌의 순서만 반영한 값이라(명도차 > 색상 > 채도, Hirayama 1998) 둘 중 고르기 선택으로 사람마다 다시 맞춘다.
 * 인상·질감은 취향을 답했을 때만, 치아는 늘 조금만
 */
export const BASE_WEIGHTS: AxisVector = {
  lightness: 0.22,
  undertone: 0.22,
  redness: 0.08,
  chroma: 0.12,
  harmony: 0.08,
  fit: 0.14,
  trend: 0.08,
  impression: 0.06,
  texture: 0.06,
  teeth: 0.04,
};

export const AXIS_KEYS = AXES.map(([k]) => k);

/** 둘 중 고르기 한 번. 이긴 쪽과 진 쪽의 항목별 값(−1~1) */
export interface Pick {
  winner: AxisVector;
  loser: AxisVector;
}

export function zeroVector(): AxisVector {
  return Object.fromEntries(AXIS_KEYS.map((k) => [k, 0])) as AxisVector;
}

/** 합이 1이 되게. 전부 0이면 그대로 */
export function normalize(w: AxisVector): AxisVector {
  const sum = AXIS_KEYS.reduce((s, k) => s + Math.max(0, w[k]), 0);
  if (sum <= 0) return { ...w };
  return Object.fromEntries(AXIS_KEYS.map((k) => [k, Math.max(0, w[k]) / sum])) as AxisVector;
}

/** 선택이 모일수록 출발 가중치에서 얼마나 멀리 갈 수 있는지. 클수록 출발값을 더 믿는다 */
const PRIOR_STRENGTH = 4;
const STEPS = 300;
const RATE = 0.03;

/**
 * 둘 중 고르기 결과로 가중치를 배운다(Bradley–Terry). "이긴 쪽 점수 > 진 쪽 점수"가 될 확률의 로그를 최대로 하되,
 * 출발 가중치에서 멀어지는 만큼 벌점을 줘서 선택 일곱 번으로도 한 항목에 쏠리지 않는다.
 * 가중치는 0 이상이고 합이 1. 선택이 없으면 출발값 그대로
 */
export function learnWeights(base: AxisVector, picks: Pick[]): AxisVector {
  const w = { ...base };
  if (!picks.length) return normalize(w);
  const diffs = picks.map(({ winner, loser }) => Object.fromEntries(AXIS_KEYS.map((k) => [k, winner[k] - loser[k]])) as AxisVector);
  for (let step = 0; step < STEPS; step++) {
    const grad = zeroVector();
    for (const d of diffs) {
      const margin = AXIS_KEYS.reduce((s, k) => s + w[k] * d[k], 0);
      const miss = 1 / (1 + Math.exp(margin));
      for (const k of AXIS_KEYS) grad[k] -= miss * d[k];
    }
    for (const k of AXIS_KEYS) {
      grad[k] += PRIOR_STRENGTH * (w[k] - base[k]);
      w[k] = Math.max(0, w[k] - RATE * grad[k]);
    }
  }
  return normalize(w);
}
