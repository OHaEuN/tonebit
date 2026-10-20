import type { LinearRgb } from "@/types/analysis";
import { linearize, luma, relativeLuminance } from "@/features/analysis/color";
import { CLIP_MAX } from "@/features/analysis/constants";
import { median } from "@/features/analysis/sample";

/** 흰 종이 반사율. 카메라가 맞추는 18% 회색 대비 흰 종이 약 85% (constants.ts WHITE_TARGET_Y와 같은 가정) */
const PAPER_REFLECTANCE = 0.85;
/** 립 스와치의 윤기(반사광)를 빼려고 밝은 순으로 버리는 비율 */
const GLOSS_DROP = 0.15;
/** 칠한 곳은 종이보다 이만큼은 어두워야 한다. 종이를 두 번 누른 경우를 거른다 */
const SWATCH_MAX_OF_PAPER = 0.92;
/** 선형 채도((max−min)/max)가 이보다 낮으면 색이 없는 곳(종이 그림자·글씨) */
const SWATCH_MIN_SATURATION = 0.12;

/** 누른 자리 픽셀에서 반사광·클리핑을 빼고 채널별 중앙값. 남는 픽셀이 없으면 null */
export function swatchColor(pixels: ArrayLike<number>): LinearRgb | null {
  const kept: [number, number, number, number][] = [];
  for (let i = 0; i + 2 < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    if (r >= CLIP_MAX || g >= CLIP_MAX || b >= CLIP_MAX) continue;
    kept.push([linearize(r), linearize(g), linearize(b), luma(r, g, b)]);
  }
  if (!kept.length) return null;
  kept.sort((a, b) => a[3] - b[3]);
  kept.length = Math.max(1, Math.round(kept.length * (1 - GLOSS_DROP)));
  return { r: median(kept.map((k) => k[0])), g: median(kept.map((k) => k[1])), b: median(kept.map((k) => k[2])) };
}

export type SwatchCheck = { color: LinearRgb } | { error: "brighter" | "noColor" };

/**
 * 같은 사진의 흰 종이로 나눠 조명과 무관한 제품 반사율을 낸다(von Kries). 종이가 바탕이자 흰색 기준이라 조명이 상쇄된다.
 * 형광증백제 든 복사지는 햇빛(자외선)에서 푸르게 찍혀 노란기가 덜 잡히므로 실내 조명에서 찍게 안내한다
 */
export function swatchReflectance(swatch: LinearRgb, paper: LinearRgb): SwatchCheck {
  if (relativeLuminance(swatch.r, swatch.g, swatch.b) > relativeLuminance(paper.r, paper.g, paper.b) * SWATCH_MAX_OF_PAPER) {
    return { error: "brighter" };
  }
  const color = {
    r: Math.min(1, (swatch.r / paper.r) * PAPER_REFLECTANCE),
    g: Math.min(1, (swatch.g / paper.g) * PAPER_REFLECTANCE),
    b: Math.min(1, (swatch.b / paper.b) * PAPER_REFLECTANCE),
  };
  const max = Math.max(color.r, color.g, color.b);
  if (!(max > 0) || (max - Math.min(color.r, color.g, color.b)) / max < SWATCH_MIN_SATURATION) return { error: "noColor" };
  return { color };
}
