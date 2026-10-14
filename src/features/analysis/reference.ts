import type { LinearRgb, ReferenceSource } from "@/types/analysis";
import { relativeLuminance } from "./color";
import {
  REFERENCE_GAIN_RANGE,
  REFERENCE_MAX_SATURATION,
  REFERENCE_OVER_SKIN,
  SCENE_REFERENCE,
  SCLERA_MIN_PIXELS,
  SCLERA_REFERENCE,
  TEETH_MIN_PIXELS,
  TEETH_REFERENCE,
  WHITE_TARGET_Y,
} from "./constants";
import { sceneGains } from "./illuminant";
import { median, type RegionStat } from "./sample";

/** 믿을 만한 순서. 여러 장을 합칠 때는 가장 약한 기준으로 본다 */
export const REFERENCE_RANK: Record<ReferenceSource, number> = { white: 4, teeth: 3, sclera: 2, scene: 1, none: 0 };

export function weakerReference(a: ReferenceSource, b: ReferenceSource): ReferenceSource {
  return REFERENCE_RANK[a] <= REFERENCE_RANK[b] ? a : b;
}

/** 결과 화면에 붙는 설명 */
export const REFERENCE_LABEL: Record<ReferenceSource, string> = {
  white: "직접 찍은 흰색 기준으로 조명 보정",
  teeth: "치아 기준으로 조명 보정",
  sclera: "눈 흰자 기준으로 조명 보정",
  scene: "배경 기준으로 조명 절반 보정",
  none: "조명 보정 없음",
};

/** 사진 탭에 붙는 짧은 표시. 완전 보정일 때만 */
export const REFERENCE_SHORT: Partial<Record<ReferenceSource, string>> = {
  white: "흰색 기준",
  teeth: "치아 기준",
  sclera: "흰자 기준",
};

/** 이용자가 찍은 흰색의 목표: 배경 보정 공간의 "흰 종이" */
export const WHITE_TARGET: LinearRgb = {
  r: SCENE_REFERENCE.r * WHITE_TARGET_Y,
  g: SCENE_REFERENCE.g * WHITE_TARGET_Y,
  b: SCENE_REFERENCE.b * WHITE_TARGET_Y,
};

const clamp = (v: number) => Math.min(REFERENCE_GAIN_RANGE[1], Math.max(REFERENCE_GAIN_RANGE[0], v));

/** 기준(est)이 목표 색(target)이 되게 하는 선형 RGB 게인. 조명의 색과 밝기를 완전히 되돌린다 (von Kries) */
export function fullGains(est: LinearRgb, target: LinearRgb): LinearRgb | null {
  if (!(est.r > 0) || !(est.g > 0) || !(est.b > 0)) return null;
  return { r: clamp(target.r / est.r), g: clamp(target.g / est.g), b: clamp(target.b / est.b) };
}

/**
 * 자동으로 찾은 치아·흰자를 기준으로 믿을지. 픽셀이 충분하고, 피부보다 밝고(감은 눈·그늘진 입 제외),
 * 색이 옅어야(입술·충혈 제외) 한다. skinY는 보정 전 피부의 상대 휘도
 */
export function usableReference(stat: RegionStat | null | undefined, minPixels: number, skinY: number): LinearRgb | null {
  if (!stat || stat.n < minPixels) return null;
  if (relativeLuminance(stat.r, stat.g, stat.b) < skinY * REFERENCE_OVER_SKIN) return null;
  const max = Math.max(stat.r, stat.g, stat.b);
  if (!(max > 0) || (max - Math.min(stat.r, stat.g, stat.b)) / max > REFERENCE_MAX_SATURATION) return null;
  return { r: stat.r, g: stat.g, b: stat.b };
}

/** 양 눈 중 쓸 수 있는 흰자의 채널별 중앙값 */
export function scleraReference(eyes: (RegionStat | null)[], skinY: number): LinearRgb | null {
  const ok = eyes.map((e) => usableReference(e, SCLERA_MIN_PIXELS, skinY)).filter((e): e is LinearRgb => e !== null);
  if (!ok.length) return null;
  return { r: median(ok.map((e) => e.r)), g: median(ok.map((e) => e.g)), b: median(ok.map((e) => e.b)) };
}

export interface ReferenceInput {
  /** 이용자가 찍은 흰색의 선형 RGB */
  white?: LinearRgb | null;
  teeth?: RegionStat | null;
  sclera?: (RegionStat | null)[];
  /** 배경 평균 선형 RGB */
  scene?: LinearRgb | null;
  /** 보정 전 피부 상대 휘도 */
  skinY: number;
}

/**
 * 쓸 수 있는 가장 믿을 만한 기준을 골라 게인을 낸다. 흰색 > 치아 > 흰자 > 배경(절반) > 없음.
 * 치아·흰자는 조명 추정 잡음이 배경의 1/5·1/3이라(README) 있으면 배경보다 먼저 쓴다
 */
export function pickGains(input: ReferenceInput): { gains: LinearRgb | null; reference: ReferenceSource } {
  const white = input.white && fullGains(input.white, WHITE_TARGET);
  if (white) return { gains: white, reference: "white" };
  const teeth = usableReference(input.teeth, TEETH_MIN_PIXELS, input.skinY);
  const teethGains = teeth && fullGains(teeth, TEETH_REFERENCE);
  if (teethGains) return { gains: teethGains, reference: "teeth" };
  const sclera = input.sclera && scleraReference(input.sclera, input.skinY);
  const scleraGains = sclera && fullGains(sclera, SCLERA_REFERENCE);
  if (scleraGains) return { gains: scleraGains, reference: "sclera" };
  const scene = input.scene && sceneGains(input.scene);
  if (scene) return { gains: scene, reference: "scene" };
  return { gains: null, reference: "none" };
}
