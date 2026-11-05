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

/** 항목 키와 짧은 이름. 이름은 분석 용어 대신 이용자가 읽는 말로(가중치 변화 알약 등에 쓴다) */
export const AXES = [
  ["lightness", "진하기"],
  ["undertone", "웜·쿨 방향"],
  ["redness", "혈색"],
  ["chroma", "선명함"],
  ["harmony", "피부와 조화"],
  ["fit", "내 톤 팔레트"],
  ["trend", "유행"],
  ["impression", "원하는 느낌"],
  ["texture", "질감"],
  ["teeth", "치아 밝기"],
] as const;
export type AxisKey = (typeof AXES)[number][0];
export type AxisVector = Record<AxisKey, number>;
export const AXIS_LABEL: Record<AxisKey, string> = Object.fromEntries(AXES) as Record<AxisKey, string>;

/** 항목별 막대 옆에 쓰는 문장. 막대가 길수록 이 문장이 맞다 */
export const AXIS_STATEMENT: Record<AxisKey, string> = {
  lightness: "피부보다 알맞게 진해요",
  undertone: "내 웜·쿨에 맞는 색이에요",
  redness: "혈색이 살아 보여요",
  chroma: "선명함이 알맞아요",
  harmony: "피부색과 어우러져요",
  fit: "내 톤 팔레트에 가까워요",
  trend: "요즘 많이 찾는 색이에요",
  impression: "원하는 느낌에 맞아요",
  texture: "좋아하는 질감이에요",
  teeth: "치아가 하얘 보이는 색",
};

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
  trend: 0.05,
  impression: 0.06,
  texture: 0.06,
  teeth: 0.04,
};

export const AXIS_KEYS = AXES.map(([k]) => k);

/** 립 하나의 생김새. 선택의 경향을 말로 풀 때 쓴다 */
export interface Traits {
  /** 피부 L* − 입술 위 L*. 클수록 진하다 */
  lightnessGap: number;
  /** 입술 위 C* − 최적 C*. 클수록 선명하다 */
  chromaGap: number;
  /** 입술 위 색상각 − 최적 색상각. 양수면 오렌지 쪽, 음수면 핑크 쪽 */
  hueGap: number;
}

/** 둘 중 고르기 한 번. 이긴 쪽과 진 쪽의 항목별 값(−1~1)과 생김새 */
export interface Pick {
  winner: AxisVector;
  loser: AxisVector;
  winnerTraits?: Traits;
  loserTraits?: Traits;
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
const PRIOR_STRENGTH = 12;
/**
 * 선택으로 배우는 항목. 일곱 번의 선택으로 열 항목을 다 맞추면 잡음에 맞춰지므로(치아 −70% 같은 엉뚱한 변화),
 * 얼굴과 색의 관계를 말하는 큰 항목 다섯 개만 배우고 나머지는 출발값을 지킨다
 */
const LEARNABLE: AxisKey[] = ["lightness", "undertone", "redness", "chroma", "fit"];
/** 어떤 항목도 출발 가중치의 이 비율 아래로는 내려가지 않는다. 항목이 0이 되면 막대가 사라지고 점수 설명이 어긋난다 */
const MIN_SHARE = 0.25;
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
  const active = LEARNABLE.filter((k) => base[k] > 0);
  const meanBase = active.reduce((s, k) => s + base[k], 0) / Math.max(1, active.length);
  const diffs = picks.map(({ winner, loser }) => Object.fromEntries(AXIS_KEYS.map((k) => [k, winner[k] - loser[k]])) as AxisVector);
  for (let step = 0; step < STEPS; step++) {
    const grad = zeroVector();
    for (const d of diffs) {
      const margin = AXIS_KEYS.reduce((s, k) => s + w[k] * d[k], 0);
      const miss = 1 / (1 + Math.exp(margin));
      for (const k of active) grad[k] -= miss * d[k];
    }
    for (const k of active) {
      // 출발값이 작은 항은 같은 절대 변화가 비율로는 크게 보이니, 평균보다 작은 항은 출발값에 반비례해 더 세게 되돌린다
      grad[k] += PRIOR_STRENGTH * (w[k] - base[k]) * Math.max(1, meanBase / base[k]);
      w[k] = Math.max(MIN_SHARE * base[k], w[k] - RATE * grad[k]);
    }
  }
  return normalize(w);
}

/** 이긴 쪽과 진 쪽의 생김새 차이가 이보다 크면 경향으로 말한다 */
const TREND_LIGHTNESS = 3;
const TREND_CHROMA = 4;
const TREND_HUE = 5;

/** 선택이 한쪽으로 기운 생김새를 말로. 예: ["더 진한 색", "더 차분한 색"]. 기운 게 없으면 빈 배열 */
export function describePicks(picks: Pick[]): string[] {
  const pairs = picks.filter((p): p is Pick & { winnerTraits: Traits; loserTraits: Traits } => Boolean(p.winnerTraits && p.loserTraits));
  if (!pairs.length) return [];
  const mean = (k: keyof Traits) => pairs.reduce((s, p) => s + (p.winnerTraits[k] - p.loserTraits[k]), 0) / pairs.length;
  const out: string[] = [];
  const dl = mean("lightnessGap");
  if (dl > TREND_LIGHTNESS) out.push("더 진한 색");
  else if (dl < -TREND_LIGHTNESS) out.push("더 밝은 색");
  const dc = mean("chromaGap");
  if (dc > TREND_CHROMA) out.push("더 선명한 색");
  else if (dc < -TREND_CHROMA) out.push("더 차분한 색");
  const dh = mean("hueGap");
  if (dh > TREND_HUE) out.push("더 오렌지 쪽 색");
  else if (dh < -TREND_HUE) out.push("더 핑크 쪽 색");
  return out;
}

export interface WeightChange {
  key: AxisKey;
  label: string;
  /** 배운 가중치 ÷ 출발 가중치. 1보다 크면 더 중요해졌다 */
  ratio: number;
}

/** 배운 가중치가 출발값에서 이 비율 이상 움직인 항만 보여 준다 */
const CHANGE_MIN = 0.15;
const CHANGE_MAX_ITEMS = 3;

/** 선택으로 많이 움직인 가중치부터. 둘 다 합이 1로 맞춘 뒤 비교한다 */
export function weightChanges(base: AxisVector, learned: AxisVector): WeightChange[] {
  const b = normalize(base);
  const w = normalize(learned);
  return AXIS_KEYS.filter((k) => b[k] > 0 && w[k] > 0)
    .map((key) => ({ key, label: AXIS_LABEL[key], ratio: w[key] / b[key] }))
    .filter((c) => Math.abs(c.ratio - 1) >= CHANGE_MIN)
    .sort((x, y) => Math.abs(y.ratio - 1) - Math.abs(x.ratio - 1))
    .slice(0, CHANGE_MAX_ITEMS);
}
