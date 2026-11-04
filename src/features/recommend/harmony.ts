import type { Lab, Season } from "@/types/analysis";
import type { Finish, Swatch } from "@/types/product";
import { chroma, hexToLab, hueAngle, labToLinear, linearRgbToLab } from "@/features/analysis/color";
import { toTrueSpace } from "@/features/analysis/reference";
import { hexToLinear, layerColor } from "@/features/lipTryOn/tint";
import { SEASON_INFO, SEASONS } from "./palettes";

/**
 * 맨입술을 못 읽었을 때 피부에 더하는 입술-피부 차이. 한국 20대 여성 500명 맨입술 평균(민혜조 2011: L* 47.6, a* 20.2, b* 13.6)과
 * 볼 평균(김도은·김영삼 2020: 약 60, 13.5, 17.2)의 차이다
 */
const LIP_FROM_SKIN: Lab = { L: -12.4, a: 6.7, b: -3.4 };

/** 제형별로 입술색을 덮는 정도. 렌더링(LIP_STYLES)과 같은 순서의 출발값 */
export const FINISH_COVERAGE: Record<Finish, number> = { matte: 0.9, velvet: 0.8, cream: 0.75, liquid: 0.75, glossy: 0.5, powder: 0.5 };
/** 제형을 모르는 팔레트 색 */
const DEFAULT_COVERAGE = 0.75;

/**
 * 립 색과 피부의 관계를 네 각도로 본다. 각 항은 −1~1이고 최적점에서 1, 멀어질수록 깎이는 봉우리 꼴이라
 * (일정 수준만 넘으면 만점인 함수를 쓰면 제품 수십 개가 100점에 몰린다) 제품마다 점수가 갈린다.
 *
 * 1. 밝기 대비 — POLA(Hirayama 외 1998, 평가자 137명, R=0.84): 어울림은 피부색 자체보다 "립과 피부의 차이"가 정하고
 *    영향은 명도차 > 색상차 > 채도차. 립이 피부보다 어두워야 좋고 같거나 밝으면 나빴다. 입술-피부 명도 대비는 여성성·건강의
 *    단서(Russell 2009; Jones, Russell & Ward 2015)지만 아주 어두운 립은 피부를 어둡게 보이게 한다(Kobayashi 2017, d=0.58) → 최적점.
 *    최적점은 그 사람의 자연 대비(피부 L* − 눈썹 L*)로 조금 옮긴다. 어울림의 개인차를 가장 잘 설명한 변수가 머리색이었다(Maki & Yamamoto 1998)
 * 2. 색 방향 — Hirayama 1998: 피부 색상각에서 붉은·자주 쪽으로 먼셀 100분할 9~19단계(CIELAB 약 30~65°) 떨어진 립이 가장 좋았다
 * 3. 혈색 — Stephen & McKeegan 2010, Porcheron 2013: 입술 a*가 피부보다 높을수록 매력·건강·젊어 보인다. 클수록 좋되 서서히
 * 4. 선명도 — Hirayama 1998의 채도차 항(가장 약함)과 12시즌의 브라이트·뮤트 축: 피부 채도가 높을수록 선명한 립, 낮을수록 차분한 립
 * 가중치와 최적값·폭은 위 순서만 반영한 출발값이다
 */
const LIGHTNESS_OPTIMUM = 14;
const LIGHTNESS_WIDTH = 14;
/** 자연 대비(피부 L* − 눈썹 L*)의 전형값(피부 60, 눈썹 30)과, 거기서 1 벗어날 때 밝기 최적점이 움직이는 양 */
const NATURAL_CONTRAST_TYPICAL = 30;
const NATURAL_CONTRAST_SLOPE = 0.25;
const LIGHTNESS_OPTIMUM_MIN = 9;
const LIGHTNESS_OPTIMUM_MAX = 20;
const HUE_OPTIMUM = 47;
const HUE_WIDTH = 24;
const REDNESS_SCALE = 35;
/** 입술 위 채도(C*)의 최적값 = CHROMA_BASE + CHROMA_SLOPE × 피부 채도. 피부 C* 20이면 40, 30이면 49 */
const CHROMA_BASE = 22;
const CHROMA_SLOPE = 0.9;
const CHROMA_WIDTH = 20;
const WEIGHTS = { lightness: 0.4, hue: 0.3, redness: 0.15, chroma: 0.15 } as const;
/**
 * 최종 점수에서 시즌 팔레트 궁합의 몫. 셀카 시즌 판정은 공개 최고치도 약 55%라서 피부와의 색 관계를 더 크게 본다
 */
const SEASON_WEIGHT = 0.4;
/** 제품 색이 시즌 팔레트의 가장 가까운 색에서 이만큼(Lab 거리) 떨어지면 궁합이 e^-1(약 37%)로 떨어진다 */
const PALETTE_SIGMA = 18;

export interface Harmony {
  /** 0~100. 피부와의 색 관계만 본 점수 */
  score: number;
  /** 각 항목 −1~1 */
  lightness: number;
  hue: number;
  redness: number;
  chroma: number;
  /** 피부 L* − 입술 위 L*. 양수면 립이 피부보다 어둡다 */
  lightnessGap: number;
  /** 이 사람에게 가장 좋은 밝기 차이 */
  lightnessOptimum: number;
  /** 피부 색상각 − 입술 위 색상각(°). 양수면 립이 피부보다 붉은·자주 쪽 */
  hueGap: number;
  /** 입술 위 채도 − 이 피부에 맞는 채도. 양수면 더 선명하다 */
  chromaGap: number;
  /** 이 사람의 자연 대비(피부 L* − 눈썹 L*). 눈썹을 못 읽었으면 없다 */
  naturalContrast?: number;
}

/** 점수에 쓰는 얼굴 쪽 추가 정보 */
export interface HarmonyContext {
  /** 피부와 같은 보정을 거친 눈썹(털) 색, 분석 공간 */
  brow?: Lab;
}

const wrap180 = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** 최적값에서 1, 폭만큼 멀어지면 약 −0.26, 두 배 멀어지면 −0.96 */
const peak = (x: number, optimum: number, width: number) => 2 * Math.exp(-(((x - optimum) / width) ** 2)) - 1;

/** 실제 색 공간의 피부·눈썹과, 입술 위에 보일 색으로 본 어울림 */
export function lipHarmony(skin: Lab, onLip: Lab, context: HarmonyContext = {}): Harmony {
  const naturalContrast = context.brow ? skin.L - context.brow.L : undefined;
  const shift = naturalContrast === undefined ? 0 : NATURAL_CONTRAST_SLOPE * (naturalContrast - NATURAL_CONTRAST_TYPICAL);
  const lightnessOptimum = clamp(LIGHTNESS_OPTIMUM + shift, LIGHTNESS_OPTIMUM_MIN, LIGHTNESS_OPTIMUM_MAX);
  const lightnessGap = skin.L - onLip.L;
  const lightness = peak(lightnessGap, lightnessOptimum, LIGHTNESS_WIDTH);
  const hueGap = wrap180(hueAngle(skin) - hueAngle(onLip));
  const hue = peak(hueGap, HUE_OPTIMUM, HUE_WIDTH);
  const redness = Math.tanh((onLip.a - skin.a) / REDNESS_SCALE);
  const chromaGap = chroma(onLip) - (CHROMA_BASE + CHROMA_SLOPE * chroma(skin));
  const chromaFit = peak(chromaGap, 0, CHROMA_WIDTH);
  const h = WEIGHTS.lightness * lightness + WEIGHTS.hue * hue + WEIGHTS.redness * redness + WEIGHTS.chroma * chromaFit;
  return { score: Math.round((h + 1) * 50), lightness, hue, redness, chroma: chromaFit, lightnessGap, lightnessOptimum, hueGap, chromaGap, naturalContrast };
}

/** 분석 공간 Lab → 실제 색(분광측색 밝기) 공간 Lab */
export function toTrueLab(lab: Lab): Lab {
  const c = toTrueSpace(labToLinear(lab));
  return linearRgbToLab(c.r, c.g, c.b);
}

/** 입술 위에 실제로 보일 색. 실제 색 공간의 맨입술 위에 제품을 제형만큼 덮는다 */
export function onLipColor(hex: string, bareLip: Lab, coverage: number): Lab {
  const c = layerColor(labToLinear(bareLip), hexToLinear(hex), coverage);
  return linearRgbToLab(c.r, c.g, c.b);
}

export interface HarmonyItem extends Swatch {
  finish?: Finish;
  /** 이 색이 속한 시즌 팔레트 */
  seasons: Season[];
}

export interface RankedItem<T extends HarmonyItem> {
  item: T;
  harmony: Harmony;
  /** 0~1. 시즌 팔레트 궁합(시즌 확률 가중) */
  fit: number;
  /** 0~100. 피부와의 색 관계(60%)와 시즌 팔레트 궁합(40%)을 합친 최종 점수 */
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
 * 측정한 피부·입술·눈썹(분석 공간)과 시즌 확률로 립 후보를 어울림 높은 순으로 줄 세운다. 입술을 못 읽었으면 피부에 평균 입술-피부 차이를 더해 쓴다
 */
export function rankLips<T extends HarmonyItem>(skin: Lab, lip: Lab | undefined, odds: Record<Season, number>, items: T[], context: HarmonyContext = {}): RankedItem<T>[] {
  const s = toTrueLab(skin);
  const bare = lip ? toTrueLab(lip) : { L: s.L + LIP_FROM_SKIN.L, a: s.a + LIP_FROM_SKIN.a, b: s.b + LIP_FROM_SKIN.b };
  const trueContext = { brow: context.brow && toTrueLab(context.brow) };
  return items
    .map((item) => {
      const harmony = lipHarmony(s, onLipColor(item.hex, bare, item.finish ? FINISH_COVERAGE[item.finish] : DEFAULT_COVERAGE), trueContext);
      const fit = seasonFit(item.hex, odds);
      const score = Math.round((1 - SEASON_WEIGHT) * harmony.score + SEASON_WEIGHT * 100 * fit);
      return { item, harmony, fit, score };
    })
    .sort((a, b) => b.score - a.score || b.harmony.score - a.harmony.score);
}

export interface HarmonyAxis {
  key: "lightness" | "hue" | "redness" | "chroma" | "fit";
  label: string;
  /** 0~1 */
  value: number;
}

/** 다섯 각도의 점수(0~1). 화면의 항목별 막대에 쓴다 */
export function harmonyBreakdown(ranked: Pick<RankedItem<HarmonyItem>, "harmony" | "fit">): HarmonyAxis[] {
  const { harmony: h, fit } = ranked;
  const unit = (v: number) => (v + 1) / 2;
  return [
    { key: "lightness", label: "밝기 대비", value: unit(h.lightness) },
    { key: "hue", label: "색 방향", value: unit(h.hue) },
    { key: "redness", label: "혈색", value: unit(h.redness) },
    { key: "chroma", label: "선명도", value: unit(h.chroma) },
    { key: "fit", label: "톤 팔레트", value: fit },
  ];
}

const PRAISE: Record<Exclude<HarmonyAxis["key"], "fit">, string> = {
  lightness: "피부보다 알맞게 진해서 입술이 또렷해 보여요",
  hue: "피부에서 붉은 쪽으로 알맞게 떨어져 색이 잘 받아요",
  redness: "혈색이 살아 생기 있어 보여요",
  chroma: "피부의 선명도와 잘 맞아요",
};

/** 점수를 만든 이유 중 가장 도드라진 것 하나를 말로. 깎인 항이 있으면 그것부터, 없으면 가장 잘 맞는 항을 */
export function harmonyNote(h: Harmony): string {
  if (h.lightness < 0 && h.lightnessGap < h.lightnessOptimum) return "피부와 밝기가 비슷하거나 더 밝아서 입술이 묻혀 보일 수 있어요";
  if (h.lightness < 0) return "피부보다 많이 어두워서 얼굴이 가라앉아 보일 수 있어요";
  if (h.hue < 0 && h.hueGap < HUE_OPTIMUM) return "피부와 색감이 가까워 얼굴과 섞여 보일 수 있어요";
  if (h.hue < 0) return "피부보다 지나치게 보랏빛이라 얼굴과 따로 놀 수 있어요";
  if (h.chroma < 0 && h.chromaGap > 0) return "피부에 비해 너무 선명해서 립만 튀어 보일 수 있어요";
  if (h.chroma < 0) return "피부에 비해 흐려서 밋밋해 보일 수 있어요";
  if (h.redness < 0.2) return "붉은기가 약해서 혈색이 덜 살아 보여요";
  if (h.score < 80) return "무난하게 어울려요";
  const best = (["lightness", "hue", "redness", "chroma"] as const).reduce((a, b) => (h[b] > h[a] ? b : a));
  return PRAISE[best];
}
