import type { Lab, Season, Subtype } from "@/types/analysis";
import type { Finish, Swatch } from "@/types/product";
import { chroma, hexToLab, labToLinear, linearRgbToLab } from "@/features/analysis/color";
import { toTrueSpace } from "@/features/analysis/reference";
import { coverageOf } from "@/features/lipTryOn/render";
import { tintLab } from "@/features/lipTryOn/tint";
import { SEASON_INFO, SEASONS } from "./palettes";
import { AXIS_KEYS, AXIS_LABEL, BASE_WEIGHTS, normalize, zeroVector, type AxisKey, type AxisVector, type Feel, type Taste } from "./preference";

/**
 * 맨입술을 못 읽었을 때 피부에 더하는 입술-피부 차이. 한국 20대 여성 500명 맨입술 평균(민혜조 2011: L* 47.6, a* 20.2, b* 13.6)과
 * 볼 평균(김도은·김영삼 2020: 약 60, 13.5, 17.2)의 차이다
 */
const LIP_FROM_SKIN: Lab = { L: -12.4, a: 6.7, b: -3.4 };

/**
 * 립이 피부와 어울리는지를 열 각도로 본다. 각 항은 −1~1이고, 최적점에서 1·멀어질수록 깎이는 봉우리 꼴이라 제품마다 갈린다.
 * 최적점은 그 사람의 세부 타입(라이트·브라이트·트루·뮤트·딥), 시즌 확률, 눈썹 자연 대비, 취향으로 움직인다.
 * 같은 피부색이면 누구에게나 같은 중간 핑크가 1등이 되던 이전 점수(피부 색상각 기준 47°)를 버리고 웜·쿨과 깊이가 답을 가르게 했다.
 *
 * 1. 밝기 대비 — Hirayama 1998(POLA, 137명): 어울림은 립과 피부의 차이가 정하고 명도차 > 색상차 > 채도차. 립이 피부보다 어두워야 하고
 *    (Russell 2009; Jones·Russell·Ward 2015) 아주 어두우면 역효과(Kobayashi 2017). 최적 차이는 딥일수록 크고(Kim & Kim 2020: 가을·겨울 딥은
 *    저명도 립이 best) 눈썹 자연 대비가 클수록 크다(Maki & Yamamoto 1998)
 * 2. 색 방향 — 웜은 코랄·브릭 쪽, 쿨은 핑크·베리 쪽(Kim & Kim 2020: 봄·가을은 옐로베이스, 겨울은 블루베이스 레드가 best; Kiritani 2021:
 *    노란 기 얼굴엔 오렌지 립을 일본·중국 평가자 모두 높게 봄). 최적 색상각은 시즌 확률로 가중한 팔레트 색의 입술 위 색상각.
 *    보라·청색 기가 강한 색은 동아시아 평가자에게 일관되게 최하였다(Wuhan 2023 cameo red; Leeds 석사 중국 얼굴 violet) → 추가 감점
 * 3. 혈색 — Stephen & McKeegan 2010, Porcheron 2013: 입술 a*가 피부보다 높을수록 매력·건강·젊어 보인다
 * 4. 선명도 — 브라이트는 선명하게, 뮤트는 차분하게(Kim & Kim 2020; 12시즌). 최적 채도는 시즌 팔레트의 입술 위 채도 + 세부 타입 보정
 * 5. 색 조화 — Ou & Luo 2006 두 색 조화 모델(1,431쌍): 밝기차 15 이상, 채도 비슷, 밝은 쌍이 조화롭다. 피부색에 가까운 MLBB 쪽에 힘을 준다
 * 6. 톤 팔레트 — 시즌 확률로 가중한 팔레트 색과의 Lab 거리
 * 7. 유행 — 2026 F/W 키워드(물광·글레이즈 / 블러·매트 / 뮤트 뉴트럴 / 매트 베리·레드)와 올리브영 2026년 9월 월간 순위
 * 8. 인상 — Wu 2024: 매력은 립 a*·밝기·피부와의 색차, 귀여움은 낮은 색상각·작은 밝기차, 세련됨은 채도차·낮은 b*. 원하는 느낌을 답했을 때만
 * 9. 질감 — 좋아하는 질감을 답했을 때만, 제형이 맞으면 +
 * 10. 치아 — 레드·퍼플은 치아가 희게, 누드는 노랗게 보인다(Med Pharm Reports 2023, 100명). 립 색만으로 보는 작은 항
 */
const LIGHTNESS_WIDTH = 12;
/** 세부 타입별 최적 밝기 차이(피부 L* − 입술 위 L*) */
const DEPTH_OPTIMUM: Record<Subtype, number> = { light: 10, bright: 15, true: 14, soft: 12, deep: 18 };
const LIGHTNESS_OPTIMUM_MIN = 6;
const LIGHTNESS_OPTIMUM_MAX = 26;
/** 자연 대비(피부 L* − 눈썹 L*)의 전형값(피부 60, 눈썹 30)과, 거기서 1 벗어날 때 밝기 최적점이 움직이는 양(최대 ±5) */
const NATURAL_CONTRAST_TYPICAL = 30;
const NATURAL_CONTRAST_SLOPE = 0.25;
const NATURAL_CONTRAST_MAX_SHIFT = 5;
const HUE_WIDTH = 16;
/** 입술 위 색상각이 이보다 보라 쪽이면 추가로 깎는다 */
const VIOLET_MAX = -8;
const VIOLET_RANGE = 15;
const VIOLET_PENALTY = 0.8;
const REDNESS_SCALE = 35;
const CHROMA_WIDTH = 12;
const SUBTYPE_CHROMA_SHIFT: Record<Subtype, number> = { light: -3, bright: 8, true: 0, soft: -7, deep: 2 };
/** 취향이 밝기 최적점과 채도 최적점을 옮기는 양 */
const FEEL_LIGHTNESS: Record<Feel, number> = { natural: -3, vivid: 0, bold: 4 };
const FEEL_CHROMA: Record<Feel, number> = { natural: -6, vivid: 2, bold: 6 };
/** 제품 색이 시즌 팔레트의 가장 가까운 색에서 이만큼(Lab 거리) 떨어지면 궁합이 e^-1(약 37%)로 떨어진다 */
const PALETTE_SIGMA = 18;
/**
 * Ou & Luo 조화 점수를 −1~1로 펴는 반폭. 기준점은 그 사람의 시즌 팔레트 색이 받는 조화 점수의 평균이라(harmonyPrior),
 * 밝은 쌍을 좋아하는 이 모델이 깊은 피부에게 모든 립을 깎는 일이 없다
 */
const HARMONY_HALF = 0.3;

export interface Harmony {
  /** 0~100. 가중치로 합친 최종 점수 */
  score: number;
  /** 항목별 −1~1. 가중치가 0인 항목은 0 */
  axes: AxisVector;
  /** 이 점수에 쓴 가중치(합 1) */
  weights: AxisVector;
  /** 피부 L* − 입술 위 L*. 양수면 립이 피부보다 어둡다 */
  lightnessGap: number;
  /** 이 사람에게 가장 좋은 밝기 차이 */
  lightnessOptimum: number;
  /** 입술 위 색상각 − 최적 색상각(°). 음수면 더 차가운(핑크·보라) 쪽, 양수면 더 따뜻한(오렌지) 쪽 */
  hueGap: number;
  /** 입술 위 채도 − 이 사람에게 맞는 채도. 양수면 더 선명하다 */
  chromaGap: number;
  /** 이 사람의 자연 대비(피부 L* − 눈썹 L*). 눈썹을 못 읽었으면 없다 */
  naturalContrast?: number;
}

/** 점수에 쓰는 얼굴 쪽 추가 정보와 취향 */
export interface HarmonyContext {
  /** 피부와 같은 보정을 거친 눈썹(털) 색, 분석 공간 */
  brow?: Lab;
  subtype?: Subtype;
  taste?: Taste;
  /** 둘 중 고르기로 배운 가중치. 없으면 출발 가중치 */
  weights?: AxisVector;
}

/** 사람마다 정해지는 최적점. 후보 전체에 같은 값을 쓴다 */
export interface HarmonyPrior {
  lightnessOptimum: number;
  /** 입술 위 색상각(°, −180~180) */
  hueOptimum: number;
  chromaOptimum: number;
  /** 이 사람의 팔레트 색이 받는 Ou & Luo 조화 점수의 평균. 조화 항의 0점 */
  harmonyMid: number;
  naturalContrast?: number;
  feel?: Feel;
}

const wrap180 = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** 최적값에서 1, 폭만큼 멀어지면 약 −0.26, 두 배 멀어지면 −0.96 */
const peak = (x: number, optimum: number, width: number) => 2 * Math.exp(-(((x - optimum) / width) ** 2)) - 1;
const RAD = Math.PI / 180;
/** 색상각(°, −180~180). 0°가 빨강, 양수로 갈수록 노랑, 음수로 갈수록 보라 */
export const hueDeg = (lab: Lab) => Math.atan2(lab.b, lab.a) / RAD;

/** 분석 공간 Lab → 실제 색(분광측색 밝기) 공간 Lab */
export function toTrueLab(lab: Lab): Lab {
  const c = toTrueSpace(labToLinear(lab));
  return linearRgbToLab(c.r, c.g, c.b);
}

/** 입술 위에 실제로 보일 색. 얼굴에 그릴 때와 같은 이동(tintLab)이라 점수가 본 색이 곧 화면의 색이다 */
export function onLipColor(hex: string, bareLip: Lab, coverage: number): Lab {
  return tintLab(bareLip, hexToLab(hex), coverage);
}

/** 이 사람의 최적점. 팔레트 색을 같은 입술 위에 얹었을 때의 색상각·채도를 시즌 확률로 가중 평균한다 */
export function harmonyPrior(skin: Lab, bare: Lab, odds: Record<Season, number>, context: HarmonyContext = {}): HarmonyPrior {
  const subtype = context.subtype ?? "true";
  const feel = context.taste?.feel;
  const naturalContrast = context.brow ? skin.L - context.brow.L : undefined;
  const shift = naturalContrast === undefined ? 0 : clamp(NATURAL_CONTRAST_SLOPE * (naturalContrast - NATURAL_CONTRAST_TYPICAL), -NATURAL_CONTRAST_MAX_SHIFT, NATURAL_CONTRAST_MAX_SHIFT);
  const lightnessOptimum = clamp(DEPTH_OPTIMUM[subtype] + shift + (feel ? FEEL_LIGHTNESS[feel] : 0), LIGHTNESS_OPTIMUM_MIN, LIGHTNESS_OPTIMUM_MAX);
  let x = 0;
  let y = 0;
  let c = 0;
  let harmony = 0;
  let n = 0;
  for (const s of SEASONS) {
    for (const l of SEASON_INFO[s].lips) {
      const on = onLipColor(l.hex, bare, coverageOf(l.finish));
      const h = hueDeg(on) * RAD;
      x += odds[s] * Math.cos(h);
      y += odds[s] * Math.sin(h);
      c += odds[s] * chroma(on);
      harmony += odds[s] * ouLuoHarmony(skin, on);
      n += odds[s];
    }
  }
  const hueOptimum = Math.atan2(y, x) / RAD;
  const chromaOptimum = (n > 0 ? c / n : 30) + SUBTYPE_CHROMA_SHIFT[subtype] + (feel ? FEEL_CHROMA[feel] : 0);
  return { lightnessOptimum, hueOptimum, chromaOptimum, harmonyMid: n > 0 ? harmony / n : 0, naturalContrast, feel };
}

/** Ou & Luo 2006의 두 색 조화 모델 CH = HC + HL + HH. 값이 클수록 조화롭다(대략 −1~1) */
export function ouLuoHarmony(p: Lab, q: Lab): number {
  const dL = p.L - q.L;
  const dC = chroma(p) - chroma(q);
  const dE2 = dL * dL + (p.a - q.a) ** 2 + (p.b - q.b) ** 2;
  const dH = Math.sqrt(Math.max(0, dE2 - dL * dL - dC * dC));
  const hc = 0.04 + 0.53 * Math.tanh(0.8 - 0.045 * Math.hypot(dH, dC / 1.46));
  const hlSum = 0.28 + 0.54 * Math.tanh(-3.88 + 0.029 * (p.L + q.L));
  const hdL = 0.14 + 0.15 * Math.tanh(-2 + 0.2 * Math.abs(dL));
  const hueTerm = (c: Lab) => {
    const C = chroma(c);
    const h = ((hueDeg(c) + 360) % 360) * RAD;
    const ec = 0.5 + 0.5 * Math.tanh(-2 + 0.5 * C);
    const hs = -0.08 - 0.14 * Math.sin(h + 50 * RAD) - 0.07 * Math.sin(2 * h + 90 * RAD);
    const t = (90 - h / RAD) / 10;
    const ey = ((0.22 * c.L - 12.8) / 10) * Math.exp(t - Math.exp(t));
    return ec * (hs + ey);
  };
  return hc + hlSum + hdL + hueTerm(p) + hueTerm(q);
}

/** Wu 2024의 세 인상 요인을 원하는 느낌에 맞춰 −1~1로 */
function impression(feel: Feel, skin: Lab, onLip: Lab, lightnessGap: number): number {
  const h = hueDeg(onLip);
  if (feel === "bold") return 0.5 * Math.tanh((onLip.a - skin.a - 22) / 12) + 0.5 * Math.tanh((lightnessGap - 18) / 8);
  if (feel === "vivid") return 0.5 * Math.tanh((18 - h) / 12) + 0.5 * Math.tanh((12 - lightnessGap) / 6);
  return 0.5 * Math.tanh((8 - (chroma(onLip) - chroma(skin))) / 10) + 0.5 * Math.tanh((8 - onLip.b) / 8);
}

/** 차갑고 선명하고 진할수록 치아가 희게 보인다. 누드는 반대 */
function teethLook(onLip: Lab): number {
  return clamp(0.5 * Math.tanh((15 - hueDeg(onLip)) / 12) + 0.5 * Math.tanh((chroma(onLip) - 28) / 10), -1, 1);
}

/** 좋아하는 질감과 제형이 맞는지 */
function textureMatch(texture: Taste["texture"], finish?: Finish): number {
  if (!texture || texture === "any" || !finish) return 0;
  if (texture === "glossy") return finish === "glossy" ? 1 : finish === "matte" ? -1 : -0.2;
  return finish === "velvet" || finish === "matte" ? 1 : finish === "glossy" ? -1 : 0;
}

/** 피부와 입술 위 색만으로 정해지는 항목들 */
export function faceAxes(skin: Lab, onLip: Lab, prior: HarmonyPrior): Pick<Harmony, "axes" | "lightnessGap" | "lightnessOptimum" | "hueGap" | "chromaGap" | "naturalContrast"> {
  const axes = zeroVector();
  const lightnessGap = skin.L - onLip.L;
  axes.lightness = peak(lightnessGap, prior.lightnessOptimum, LIGHTNESS_WIDTH);
  const h = hueDeg(onLip);
  const hueGap = wrap180(h - prior.hueOptimum);
  axes.undertone = clamp(peak(hueGap, 0, HUE_WIDTH) - VIOLET_PENALTY * clamp((VIOLET_MAX - h) / VIOLET_RANGE, 0, 1), -1, 1);
  axes.redness = Math.tanh((onLip.a - skin.a) / REDNESS_SCALE);
  const chromaGap = chroma(onLip) - prior.chromaOptimum;
  axes.chroma = peak(chromaGap, 0, CHROMA_WIDTH);
  axes.harmony = clamp((ouLuoHarmony(skin, onLip) - prior.harmonyMid) / HARMONY_HALF, -1, 1);
  axes.teeth = teethLook(onLip);
  axes.impression = prior.feel ? impression(prior.feel, skin, onLip, lightnessGap) : 0;
  return { axes, lightnessGap, lightnessOptimum: prior.lightnessOptimum, hueGap, chromaGap, naturalContrast: prior.naturalContrast };
}

/** 가중치로 합친 0~100 점수. 쓰지 않는 항목(가중치 0)은 빠진 채로 합이 1이 되게 다시 나눈다 */
export function combine(axes: AxisVector, weights: AxisVector): number {
  const w = normalize(weights);
  const h = AXIS_KEYS.reduce((s, k) => s + w[k] * axes[k], 0);
  return Math.round(clamp((h + 1) * 50, 0, 100));
}

/** 취향·치아 사정에 따라 쓰지 않는 항목의 가중치를 0으로 */
export function activeWeights(base: AxisVector, taste?: Taste): AxisVector {
  return {
    ...base,
    impression: taste?.feel ? base.impression : 0,
    texture: taste?.texture && taste.texture !== "any" ? base.texture : 0,
  };
}

export interface HarmonyItem extends Swatch {
  finish?: Finish;
  /** 이 색이 속한 시즌 팔레트 */
  seasons: Season[];
  /** 0~1. 요즘 얼마나 찾는 색인지. 팔레트 색·내 제품은 없음 */
  trend?: number;
}

export interface RankedItem<T extends HarmonyItem> {
  item: T;
  harmony: Harmony;
  /** 0~1. 시즌 팔레트 궁합(시즌 확률 가중) */
  fit: number;
  /** 0~100. harmony.score와 같다 */
  score: number;
}

const labDistance = (a: Lab, b: Lab) => Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b);

/**
 * 이 색이 시즌 팔레트와 얼마나 가까운지(0~1)를 시즌 확률로 가중 평균한다.
 * "내 시즌 제품이면 무조건 만점"이 아니라, 내 시즌일수록·그 시즌 팔레트 색에 가까울수록 높아서 제품마다 값이 다르다
 */
export function seasonFit(hex: string, odds: Record<Season, number>): number {
  const lab = hexToLab(hex);
  let sum = 0;
  let weight = 0;
  for (const s of SEASONS) {
    const nearest = Math.min(...SEASON_INFO[s].lips.map((l) => labDistance(lab, hexToLab(l.hex))));
    sum += odds[s] * Math.exp(-((nearest / PALETTE_SIGMA) ** 2));
    weight += odds[s];
  }
  return weight > 0 ? sum / weight : 0;
}

/**
 * 측정한 피부·입술·눈썹(분석 공간), 시즌 확률, 세부 타입, 취향으로 립 후보를 어울리는 순으로 줄 세운다.
 * 입술을 못 읽었으면 피부에 평균 입술-피부 차이를 더해 쓴다
 */
export function rankLips<T extends HarmonyItem>(skin: Lab, lip: Lab | undefined, odds: Record<Season, number>, items: T[], context: HarmonyContext = {}): RankedItem<T>[] {
  const s = toTrueLab(skin);
  const bare = lip ? toTrueLab(lip) : { L: s.L + LIP_FROM_SKIN.L, a: s.a + LIP_FROM_SKIN.a, b: s.b + LIP_FROM_SKIN.b };
  const prior = harmonyPrior(s, bare, odds, { ...context, brow: context.brow && toTrueLab(context.brow) });
  const weights = normalize(activeWeights(context.weights ?? BASE_WEIGHTS, context.taste));
  return items
    .map((item) => {
      const face = faceAxes(s, onLipColor(item.hex, bare, coverageOf(item.finish)), prior);
      const fit = seasonFit(item.hex, odds);
      const axes: AxisVector = {
        ...face.axes,
        fit: 2 * fit - 1,
        trend: item.trend === undefined ? 0 : 2 * item.trend - 1,
        texture: textureMatch(context.taste?.texture, item.finish),
      };
      const score = combine(axes, weights);
      return { item, harmony: { ...face, axes, weights, score }, fit, score };
    })
    .sort((a, b) => b.score - a.score || b.harmony.axes.lightness - a.harmony.axes.lightness);
}

export interface HarmonyAxis {
  key: AxisKey;
  label: string;
  /** 0~1 */
  value: number;
}

/** 점수에 들어간 항목(가중치 > 0)의 값을 0~1로. 화면의 항목별 막대에 쓴다 */
export function harmonyBreakdown(ranked: Pick<RankedItem<HarmonyItem>, "harmony">): HarmonyAxis[] {
  const { axes, weights } = ranked.harmony;
  return AXIS_KEYS.filter((k) => weights[k] > 0).map((key) => ({ key, label: AXIS_LABEL[key], value: (axes[key] + 1) / 2 }));
}

const PRAISE: Partial<Record<AxisKey, string>> = {
  lightness: "피부보다 알맞게 진해서 입술이 또렷해 보여요",
  undertone: "내 톤 방향의 색이라 얼굴과 잘 어우러져요",
  redness: "혈색이 살아 생기 있어 보여요",
  chroma: "피부의 선명도와 잘 맞아요",
  harmony: "피부색과 조화로운 색이에요",
  trend: "요즘 많이 찾는 색이에요",
  teeth: "치아가 더 하얘 보여요",
};
const PRAISE_KEYS = Object.keys(PRAISE) as AxisKey[];

/** 이보다 많이 깎인 항만 경고로 말한다. 살짝 모자란 정도는 다른 항이 메우니 굳이 흠을 잡지 않는다 */
const WARN_BELOW = -0.3;

/** 점수를 만든 이유 중 가장 도드라진 것 하나를 말로. 분명히 깎인 항이 있으면 그것부터, 없으면 가장 잘 맞는 항을 */
export function harmonyNote(h: Harmony): string {
  const { axes } = h;
  if (axes.lightness < WARN_BELOW && h.lightnessGap < h.lightnessOptimum) return "피부와 밝기가 비슷하거나 더 밝아서 입술이 묻혀 보일 수 있어요";
  if (axes.lightness < WARN_BELOW) return "피부보다 많이 어두워서 얼굴이 가라앉아 보일 수 있어요";
  if (axes.undertone < WARN_BELOW && h.hueGap < 0) return "내 톤보다 차가운 핑크·보라 쪽이라 얼굴과 따로 놀 수 있어요";
  if (axes.undertone < WARN_BELOW) return "내 톤보다 따뜻한 오렌지 쪽이라 얼굴이 노랗게 보일 수 있어요";
  if (axes.chroma < WARN_BELOW && h.chromaGap > 0) return "피부에 비해 너무 선명해서 립만 튀어 보일 수 있어요";
  if (axes.chroma < WARN_BELOW) return "피부에 비해 흐려서 밋밋해 보일 수 있어요";
  if (axes.redness < 0) return "붉은기가 약해서 혈색이 덜 살아 보여요";
  if (h.score < 70) return "무난하게 어울려요";
  const best = PRAISE_KEYS.filter((k) => h.weights[k] > 0).reduce((a, b) => (axes[b] * h.weights[b] > axes[a] * h.weights[a] ? b : a));
  return PRAISE[best] ?? "무난하게 어울려요";
}
