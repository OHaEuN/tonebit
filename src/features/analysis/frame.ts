/**
 * 캔버스에서 픽셀을 읽어 순수 함수에 넘기는 DOM 어댑터.
 * 여기엔 판정 로직을 두지 않는다.
 */
import type { Lab, LightingIssue, LinearRgb, Point } from "@/types/analysis";
import { faceWidthRatio, scleraPatches, skinPatches } from "@/features/landmark/geometry";
import { illuminantGains, isPlausibleWhite } from "./illuminant";
import { checkLighting } from "./lighting";
import { lumaStats, meanLinearRgb, meanRgb, medianLab, representativeLab, scleraWhite } from "./sample";

/** 렌더·샘플링 해상도 상한. 이보다 크면 비례 축소 */
export const MAX_RENDER_WIDTH = 720;
export const THUMB_SIZE = { w: 64, h: 48 } as const;

export function fitSize(srcW: number, srcH: number): { w: number; h: number } {
  const s = Math.min(1, MAX_RENDER_WIDTH / srcW);
  return { w: Math.round(srcW * s), h: Math.round(srcH * s) };
}

/** 양 눈 흰자의 평균 선형 RGB. 눈을 감았거나 반사로 하얗게 날아갔으면 null */
export function measureWhite(ctx: CanvasRenderingContext2D, lm: Point[], w: number, h: number): LinearRgb | null {
  const patches = scleraPatches(lm, w, h).map((r) => ctx.getImageData(r.x, r.y, r.w, r.h).data);
  return patches.length ? scleraWhite(concat(patches)) : null;
}

/**
 * 피부 대표 Lab. 흰자가 믿을 만하게 잡히면 그걸 기준으로 조명(색온도·노출)을 보정하고,
 * 아니면 보정 없이 잰다. corrected로 어느 쪽인지 알려준다
 */
export function sampleSkin(ctx: CanvasRenderingContext2D, lm: Point[], w: number, h: number): { lab: Lab; corrected: boolean } | null {
  const pixels = skinPatches(lm, w, h).map((r) => ctx.getImageData(r.x, r.y, r.w, r.h).data);
  const white = measureWhite(ctx, lm, w, h);
  const skin = meanLinearRgb(concat(pixels));
  const gains = white && isPlausibleWhite(white, skin) ? illuminantGains(white) : null;
  const labs = pixels.map((p) => representativeLab(p, gains ?? undefined)).filter((l): l is Lab => l !== null);
  return labs.length ? { lab: medianLab(labs), corrected: gains !== null } : null;
}

function concat(buffers: Uint8ClampedArray[]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(buffers.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of buffers) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

export function measureLighting(
  ctx: CanvasRenderingContext2D,
  thumb: CanvasRenderingContext2D,
  lm: Point[],
  w: number,
  h: number,
): LightingIssue[] {
  const stats = skinPatches(lm, w, h).map((r) => lumaStats(ctx.getImageData(r.x, r.y, r.w, r.h).data));
  const avg = (key: "meanLuma" | "clippedRatio") => stats.reduce((s, v) => s + v[key], 0) / stats.length;
  thumb.drawImage(ctx.canvas, 0, 0, THUMB_SIZE.w, THUMB_SIZE.h);
  const frameMean = meanRgb(thumb.getImageData(0, 0, THUMB_SIZE.w, THUMB_SIZE.h).data);
  return checkLighting({
    faceLuma: avg("meanLuma"),
    clippedRatio: avg("clippedRatio"),
    frameMean,
    faceWidthRatio: faceWidthRatio(lm),
  });
}

export function createContext(canvas: HTMLCanvasElement, readBack = false): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { willReadFrequently: readBack });
  if (!ctx) throw new Error("2D canvas를 만들 수 없어요");
  return ctx;
}

export function createOffscreen(w: number, h: number, readBack = false): CanvasRenderingContext2D {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return createContext(c, readBack);
}
