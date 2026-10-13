/**
 * 캔버스에서 픽셀을 읽어 순수 함수에 넘기는 DOM 어댑터.
 * 여기엔 판정 로직을 두지 않는다.
 */
import type { Lab, LightingIssue, LinearRgb, Point } from "@/types/analysis";
import { faceBounds, faceWidthRatio, skinPatches } from "@/features/landmark/geometry";
import { SCENE_THUMB } from "./constants";
import { sceneGains } from "./illuminant";
import { checkLighting } from "./lighting";
import { lumaStats, meanRgb, medianLab, meanLinearRgbMasked, representativeLab } from "./sample";

/** 렌더·샘플링 해상도 상한. 이보다 크면 비례 축소 */
export const MAX_RENDER_WIDTH = 720;
export const THUMB_SIZE = { w: 64, h: 48 } as const;

export function fitSize(srcW: number, srcH: number): { w: number; h: number } {
  const s = Math.min(1, MAX_RENDER_WIDTH / srcW);
  return { w: Math.round(srcW * s), h: Math.round(srcH * s) };
}

let sceneThumb: CanvasRenderingContext2D | null = null;

/** 얼굴 bbox 밖 배경의 평균 선형 RGB. 축소본에서 잰다. 배경이 거의 없으면 null */
export function measureScene(ctx: CanvasRenderingContext2D, lm: Point[]): LinearRgb | null {
  sceneThumb ??= createOffscreen(SCENE_THUMB.w, SCENE_THUMB.h, true);
  sceneThumb.drawImage(ctx.canvas, 0, 0, SCENE_THUMB.w, SCENE_THUMB.h);
  const b = faceBounds(lm);
  return meanLinearRgbMasked(sceneThumb.getImageData(0, 0, SCENE_THUMB.w, SCENE_THUMB.h).data, SCENE_THUMB.w, (x, y) => {
    const u = (x + 0.5) / SCENE_THUMB.w;
    const v = (y + 0.5) / SCENE_THUMB.h;
    return u < b.minX || u > b.maxX || v < b.minY || v > b.maxY;
  });
}

/**
 * 피부 대표 Lab. 배경 평균색으로 조명(색온도·노출)을 일부 보정한 값이다.
 * 얼굴이 화면을 다 덮어 배경이 없으면 보정 없이 재고 corrected=false
 */
export function sampleSkin(ctx: CanvasRenderingContext2D, lm: Point[], w: number, h: number): { lab: Lab; corrected: boolean } | null {
  const scene = measureScene(ctx, lm);
  const gains = scene ? sceneGains(scene) : null;
  const labs = skinPatches(lm, w, h)
    .map((r) => representativeLab(ctx.getImageData(r.x, r.y, r.w, r.h).data, gains ?? undefined))
    .filter((l): l is Lab => l !== null);
  return labs.length ? { lab: medianLab(labs), corrected: gains !== null } : null;
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
