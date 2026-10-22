import type { ChromaLevel, Confidence, Depth, Lab, Season, Subtype, ToneResult, ToneSlug, Undertone } from "@/types/analysis";
import { chroma, hueAngle, ita } from "./color";
import { AXIS_MARGIN, CHROMA_CLEAR_MIN, HUE_COOL_MAX, HUE_NEUTRAL_HALF, HUE_WARM_MIN, ITA_LIGHT_MIN } from "./constants";

/** 시즌을 가르는 세 기준값. 재보정 스크립트가 후보 값을 같은 규칙으로 시험할 수 있게 밖으로 뺐다 */
export interface Thresholds {
  hueCenter: number;
  itaLightMin: number;
  chromaClearMin: number;
}

export const CURRENT_THRESHOLDS: Thresholds = {
  hueCenter: HUE_WARM_MIN - HUE_NEUTRAL_HALF,
  itaLightMin: ITA_LIGHT_MIN,
  chromaClearMin: CHROMA_CLEAR_MIN,
};

function undertoneOf(hue: number, center = CURRENT_THRESHOLDS.hueCenter): Undertone {
  if (hue >= center + HUE_NEUTRAL_HALF) return "warm";
  if (hue <= center - HUE_NEUTRAL_HALF) return "cool";
  return "neutral";
}

const SEASON_TABLE: Record<"warm" | "cool", Record<Depth, Season>> = {
  warm: { light: "spring", deep: "autumn" },
  cool: { light: "summer", deep: "winter" },
};

/**
 * 시즌 = 웜/쿨 × 명/암. 뉴트럴이면 채도로 가른다.
 * 봄·가을은 각각 선명·뮤트 쪽 웜, 여름·겨울은 각각 뮤트·선명 쪽 쿨이라
 * (light && clear) 또는 (deep && muted)일 때 웜 시즌으로 보낸다.
 */
function seasonOf(undertone: Undertone, depth: Depth, level: ChromaLevel): Season {
  if (undertone !== "neutral") return SEASON_TABLE[undertone][depth];
  const warmLike = (depth === "light") === (level === "clear");
  return SEASON_TABLE[warmLike ? "warm" : "cool"][depth];
}

/** 기준값 t로 시즌만 낸다. classifyTone과 같은 규칙 */
export function seasonFor(hue: number, itaDeg: number, c: number, t: Thresholds): Season {
  return seasonOf(undertoneOf(hue, t.hueCenter), itaDeg >= t.itaLightMin ? "light" : "deep", c >= t.chromaClearMin ? "clear" : "muted");
}

/** 웜/쿨 임계값을 넘어선 거리(°). 뉴트럴이면 0 */
export function hueDistance(undertone: Undertone, hue: number): number {
  if (undertone === "warm") return hue - HUE_WARM_MIN;
  if (undertone === "cool") return HUE_COOL_MAX - hue;
  return 0;
}

/** 두 축 모두 임계값에서 충분히 떨어져 있어야 high. 뉴트럴은 hue 거리 0이라 항상 low. */
function confidenceOf(undertone: Undertone, hue: number, itaDeg: number): Confidence {
  const itaDist = Math.abs(itaDeg - ITA_LIGHT_MIN);
  const score = Math.min(hueDistance(undertone, hue) / AXIS_MARGIN.hue, itaDist / AXIS_MARGIN.ita);
  if (score >= 1) return "high";
  if (score >= 0.5) return "mid";
  return "low";
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
 * 시즌 정의상 허용 축 중 적어도 하나는 0 이상이다 (예: 봄은 ITA ≥ 41이라 light ≥ 0).
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

export function classifyTone(lab: Lab): ToneResult {
  const hue = hueAngle(lab);
  const itaDeg = ita(lab);
  const c = chroma(lab);
  const undertone = undertoneOf(hue);
  const depth: Depth = itaDeg >= ITA_LIGHT_MIN ? "light" : "deep";
  const level: ChromaLevel = c >= CHROMA_CLEAR_MIN ? "clear" : "muted";
  const season = seasonOf(undertone, depth, level);
  const subtype = subtypeOf(season, axisScores(hueDistance(undertone, hue), itaDeg, c));
  return {
    season,
    subtype,
    tone: `${season}-${subtype}` as ToneSlug,
    undertone,
    depth,
    chroma: level,
    confidence: confidenceOf(undertone, hue, itaDeg),
    lab,
    ita: itaDeg,
    hue,
  };
}
