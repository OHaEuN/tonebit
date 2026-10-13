import type { Lab } from "@/types/analysis";
import { CLIP_MAX, LUMA_MIN, MAD_K, MIN_PIXELS } from "./constants";
import { luma, srgbToLab } from "./color";

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function medianLab(labs: Lab[]): Lab {
  return {
    L: median(labs.map((l) => l.L)),
    a: median(labs.map((l) => l.a)),
    b: median(labs.map((l) => l.b)),
  };
}

const CHANNELS = ["L", "a", "b"] as const;

/** 채널별 median ± MAD_K×MAD 밖을 버린다. MAD는 이상치에 끌려가지 않아 std보다 안전하다. */
function madFilter(labs: Lab[]): Lab[] {
  const bounds = CHANNELS.map((k) => {
    const values = labs.map((l) => l[k]);
    const m = median(values);
    const mad = median(values.map((v) => Math.abs(v - m)));
    return { k, lo: m - MAD_K * mad, hi: m + MAD_K * mad };
  });
  return labs.filter((l) => bounds.every(({ k, lo, hi }) => l[k] >= lo && l[k] <= hi));
}

/**
 * RGBA 픽셀 버퍼 → 대표 Lab. 하이라이트·그림자 사전 제거 후 MAD로 잔여 이상치를
 * 걸러내고 median을 취한다. 유효 픽셀이 너무 적으면 null.
 */
export function representativeLab(pixels: ArrayLike<number>): Lab | null {
  const labs: Lab[] = [];
  for (let i = 0; i + 2 < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    if (r >= CLIP_MAX || g >= CLIP_MAX || b >= CLIP_MAX) continue;
    if (luma(r, g, b) < LUMA_MIN) continue;
    labs.push(srgbToLab(r, g, b));
  }
  if (labs.length < MIN_PIXELS) return null;
  return medianLab(madFilter(labs));
}

/** 조명 체크용 통계. 패치 픽셀의 평균 휘도와 클리핑 비율. */
export function lumaStats(pixels: ArrayLike<number>): { meanLuma: number; clippedRatio: number } {
  let sum = 0;
  let clipped = 0;
  let n = 0;
  for (let i = 0; i + 2 < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    sum += luma(r, g, b);
    if (r >= CLIP_MAX || g >= CLIP_MAX || b >= CLIP_MAX) clipped++;
    n++;
  }
  return n ? { meanLuma: sum / n, clippedRatio: clipped / n } : { meanLuma: 0, clippedRatio: 0 };
}

export function meanRgb(pixels: ArrayLike<number>): { r: number; g: number; b: number } {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i + 2 < pixels.length; i += 4) {
    r += pixels[i];
    g += pixels[i + 1];
    b += pixels[i + 2];
    n++;
  }
  return n ? { r: r / n, g: g / n, b: b / n } : { r: 0, g: 0, b: 0 };
}
