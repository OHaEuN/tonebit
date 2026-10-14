import type {
  ChromaLevel,
  Confidence,
  Depth,
  Lab,
  ReferenceSource,
  Season,
  Subtype,
  ToneResult,
  ToneSlug,
  Undertone,
} from "@/types/analysis";
import { chroma, hueAngle, ita } from "./color";
import { AXIS_MARGIN, CHROMA_CLEAR_MIN, HUE_COOL_MAX, HUE_WARM_MIN, ITA_LIGHT_MIN, YELLOW_WARM_MIN } from "./constants";
import { REFERENCE_RANK } from "./reference";

export function undertoneOf(hue: number): Undertone {
  if (hue >= HUE_WARM_MIN) return "warm";
  if (hue <= HUE_COOL_MAX) return "cool";
  return "neutral";
}

const SEASON_TABLE: Record<"warm" | "cool", Record<Depth, Season>> = {
  warm: { light: "spring", deep: "autumn" },
  cool: { light: "summer", deep: "winter" },
};

/**
 * 시즌 = 웜/쿨 × 명/암. 색상각이 뉴트럴 구간이면 황색도 b*로 가른다.
 * 한국 측색 연구에서 전문가 웜/쿨 판정과 이어진 변수는 색상각이 아니라 볼의 b*였다 (constants.ts YELLOW_WARM_MIN)
 */
function seasonOf(undertone: Undertone, depth: Depth, yellow: number): Season {
  if (undertone !== "neutral") return SEASON_TABLE[undertone][depth];
  return SEASON_TABLE[yellow >= YELLOW_WARM_MIN ? "warm" : "cool"][depth];
}

/** 웜/쿨 임계값을 넘어선 거리(°). 뉴트럴이면 0 */
export function hueDistance(undertone: Undertone, hue: number): number {
  if (undertone === "warm") return hue - HUE_WARM_MIN;
  if (undertone === "cool") return HUE_COOL_MAX - hue;
  return 0;
}

/** 완전 보정(흰색·치아·흰자)이 아니면 색편향이 절반쯤 남아 있어 확신도를 "보통"까지만 준다 */
export function isFullyCorrected(reference: ReferenceSource): boolean {
  return REFERENCE_RANK[reference] >= REFERENCE_RANK.sclera;
}

/** 두 축 모두 임계값에서 충분히 떨어져 있어야 high. 뉴트럴은 hue 거리 0이라 항상 low. */
function confidenceOf(undertone: Undertone, hue: number, itaDeg: number, reference: ReferenceSource): Confidence {
  const itaDist = Math.abs(itaDeg - ITA_LIGHT_MIN);
  const score = Math.min(hueDistance(undertone, hue) / AXIS_MARGIN.hue, itaDist / AXIS_MARGIN.ita);
  if (score < 0.5) return "low";
  if (score >= 1 && isFullyCorrected(reference)) return "high";
  return "mid";
}

/** 시즌별로 허용되는 세부 타입. 앞쪽이 동점일 때 우선 */
export const SEASON_SUBTYPES: Record<Season, Subtype[]> = {
  spring: ["light", "bright", "true"],
  summer: ["light", "soft", "true"],
  autumn: ["deep", "soft", "true"],
  winter: ["deep", "bright", "true"],
};

/**
 * 각 축이 임계값에서 얼마나 벗어났는지(margin 단위). 양수일수록 그 특징이 뚜렷하다.
 * 시즌 정의상 허용 축 중 적어도 하나는 0 이상이다 (예: 봄은 light라 light ≥ 0).
 */
export function axisScores(hueDist: number, itaDeg: number, c: number): Record<Subtype, number> {
  return {
    light: (itaDeg - ITA_LIGHT_MIN) / AXIS_MARGIN.ita,
    deep: (ITA_LIGHT_MIN - itaDeg) / AXIS_MARGIN.ita,
    bright: (c - CHROMA_CLEAR_MIN) / AXIS_MARGIN.chroma,
    soft: (CHROMA_CLEAR_MIN - c) / AXIS_MARGIN.chroma,
    true: hueDist / AXIS_MARGIN.hue,
  };
}

/** 12시즌: 시즌 안에서 가장 두드러진 축을 세부 타입으로 삼는다 (Sci\ART 방식의 "dominant characteristic") */
function subtypeOf(season: Season, scores: Record<Subtype, number>): Subtype {
  return SEASON_SUBTYPES[season].reduce((best, s) => (scores[s] > scores[best] ? s : best));
}

export function classifyTone(lab: Lab, reference: ReferenceSource = "none"): ToneResult {
  const hue = hueAngle(lab);
  const itaDeg = ita(lab);
  const c = chroma(lab);
  const undertone = undertoneOf(hue);
  const depth: Depth = itaDeg >= ITA_LIGHT_MIN ? "light" : "deep";
  const level: ChromaLevel = c >= CHROMA_CLEAR_MIN ? "clear" : "muted";
  const season = seasonOf(undertone, depth, lab.b);
  const subtype = subtypeOf(season, axisScores(hueDistance(undertone, hue), itaDeg, c));
  return {
    season,
    subtype,
    tone: `${season}-${subtype}` as ToneSlug,
    undertone,
    depth,
    chroma: level,
    confidence: confidenceOf(undertone, hue, itaDeg, reference),
    lab,
    ita: itaDeg,
    hue,
    corrected: reference !== "none",
    reference,
  };
}
