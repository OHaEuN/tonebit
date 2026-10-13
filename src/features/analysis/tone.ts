import type { ChromaLevel, Confidence, Depth, Lab, Season, ToneResult, Undertone } from "@/types/analysis";
import { chroma, hueAngle, ita } from "./color";
import { CHROMA_CLEAR_MIN, CONFIDENCE_MARGIN, HUE_COOL_MAX, HUE_WARM_MIN, ITA_LIGHT_MIN } from "./constants";

function undertoneOf(hue: number): Undertone {
  if (hue >= HUE_WARM_MIN) return "warm";
  if (hue <= HUE_COOL_MAX) return "cool";
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

/** 두 축 모두 임계값에서 충분히 떨어져 있어야 high. 뉴트럴은 hue 거리 0이라 항상 low. */
function confidenceOf(undertone: Undertone, hue: number, itaDeg: number): Confidence {
  let hueDist = 0;
  if (undertone === "warm") hueDist = hue - HUE_WARM_MIN;
  if (undertone === "cool") hueDist = HUE_COOL_MAX - hue;
  const itaDist = Math.abs(itaDeg - ITA_LIGHT_MIN);
  const score = Math.min(hueDist / CONFIDENCE_MARGIN.hue, itaDist / CONFIDENCE_MARGIN.ita);
  if (score >= 1) return "high";
  if (score >= 0.5) return "mid";
  return "low";
}

export function classifyTone(lab: Lab): ToneResult {
  const hue = hueAngle(lab);
  const itaDeg = ita(lab);
  const c = chroma(lab);
  const undertone = undertoneOf(hue);
  const depth: Depth = itaDeg >= ITA_LIGHT_MIN ? "light" : "deep";
  const level: ChromaLevel = c >= CHROMA_CLEAR_MIN ? "clear" : "muted";
  return {
    season: seasonOf(undertone, depth, level),
    undertone,
    depth,
    chroma: level,
    confidence: confidenceOf(undertone, hue, itaDeg),
    lab,
    ita: itaDeg,
    hue,
  };
}
