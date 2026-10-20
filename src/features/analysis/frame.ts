/**
 * 캔버스에서 픽셀을 읽어 순수 함수에 넘기는 DOM 어댑터.
 * 여기엔 판정 로직을 두지 않는다.
 */
import type { Lab, LightingIssue, LinearRgb, Point, ReferenceSource } from "@/types/analysis";
import { cheekPatches, faceBounds, faceWidthRatio, inPolygon, lipOuterPolygon, mouthInnerPolygon, scleraRegions, skinPatches } from "@/features/landmark/geometry";
import { labToY, linearRgbToLab, luma } from "./color";
import { SCENE_THUMB, SCLERA_KEEP_BRIGHTEST, TEETH_MAX_SATURATION, TEETH_MIN_LUMA } from "./constants";
import { checkLighting } from "./lighting";
import { cameraWhite, pickGains } from "./reference";
import { lumaStats, meanRgb, medianLab, meanLinearRgbMasked, regionStat, representativeLab, type RegionStat } from "./sample";

/** 렌더·샘플링 해상도 상한. 이보다 크면 비례 축소 */
export const MAX_RENDER_WIDTH = 720;
export const THUMB_SIZE = { w: 64, h: 48 } as const;

export function fitSize(srcW: number, srcH: number, maxWidth = MAX_RENDER_WIDTH): { w: number; h: number } {
  const s = Math.min(1, maxWidth / srcW);
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

/** 폴리곤(픽셀 좌표) 안 픽셀의 통계. skip이 참인 픽셀은 뺀다 */
function polygonStat(
  ctx: CanvasRenderingContext2D,
  poly: Point[],
  keepBrightest: number,
  skip?: (x: number, y: number) => boolean,
  accept?: (r: number, g: number, b: number) => boolean,
): RegionStat | null {
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const x0 = Math.max(0, Math.floor(Math.min(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys)));
  const x1 = Math.min(ctx.canvas.width, Math.ceil(Math.max(...xs)));
  const y1 = Math.min(ctx.canvas.height, Math.ceil(Math.max(...ys)));
  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= 0 || h <= 0) return null;
  const pixels = ctx.getImageData(x0, y0, w, h).data;
  return regionStat(
    pixels,
    w,
    (x, y) => {
      const px = x0 + x + 0.5;
      const py = y0 + y + 0.5;
      if (skip?.(px, py)) return false;
      return inPolygon(px, py, poly);
    },
    keepBrightest,
    accept,
  );
}

/** 치아 후보: 입 안쪽에서 밝고 색이 옅은 픽셀 */
function isTooth(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  return luma(r, g, b) >= TEETH_MIN_LUMA && max > 0 && (max - Math.min(r, g, b)) / max < TEETH_MAX_SATURATION;
}

/** 한 사진(또는 카메라 프레임)에서 잰 피부색과 같은 보정을 거친 입술색 */
export interface SkinSample {
  lab: Lab;
  corrected: boolean;
  reference: ReferenceSource;
  /** 입술(바깥 윤곽 − 입 안쪽) 색. 못 읽으면 null */
  lip: Lab | null;
  /** 이 사진에서 완전한 흰색이 찍혔을 선형 RGB. 립·블러셔를 이 조명 아래 색으로 칠할 때 쓴다 */
  cameraWhite: LinearRgb;
}

/**
 * 피부 대표 Lab. 조명(색온도·노출)은 쓸 수 있는 가장 믿을 만한 기준으로 되돌린다:
 * 이용자가 찍은 흰색 > 흰 종이로 고정한 화이트밸런스 > 치아(+눈 흰자) > 눈 흰자 > 배경 평균색(절반). 어떤 기준을 썼는지 reference로 돌려준다
 */
export function sampleSkin(
  ctx: CanvasRenderingContext2D,
  lm: Point[],
  w: number,
  h: number,
  refs: { white?: LinearRgb; locked?: LinearRgb | null } = {},
): SkinSample | null {
  const buffers = skinPatches(lm, w, h).map((r) => ctx.getImageData(r.x, r.y, r.w, r.h).data);
  const raw = buffers.map((b) => representativeLab(b)).filter((l): l is Lab => l !== null);
  if (!raw.length) return null;
  const skinY = labToY(medianLab(raw).L);
  const { white } = refs;

  const { gains, reference } = pickGains({
    white,
    locked: refs.locked,
    teeth: white ? null : polygonStat(ctx, mouthInnerPolygon(lm, w, h), 1, undefined, isTooth),
    sclera: white ? [] : scleraRegions(lm, w, h).map(({ poly, hole }) =>
      polygonStat(ctx, poly, SCLERA_KEEP_BRIGHTEST, (x, y) => Math.hypot(x - hole.x, y - hole.y) < hole.r),
    ),
    scene: white ? null : measureScene(ctx, lm),
    skinY,
  });
  const labs = gains ? buffers.map((b) => representativeLab(b, gains)).filter((l): l is Lab => l !== null) : raw;
  const inner = mouthInnerPolygon(lm, w, h);
  const lipStat = polygonStat(ctx, lipOuterPolygon(lm, w, h), 1, (x, y) => inPolygon(x, y, inner));
  const g = gains ?? { r: 1, g: 1, b: 1 };
  return {
    lab: medianLab(labs.length ? labs : raw),
    corrected: reference !== "none",
    reference,
    lip: lipStat ? linearRgbToLab(lipStat.r * g.r, lipStat.g * g.g, lipStat.b * g.b) : null,
    cameraWhite: cameraWhite(gains),
  };
}

/** 정규화 좌표(u, v) 둘레 정사각형의 픽셀. 흰색 기준을 찍을 때 쓴다 */
export function patchAt(ctx: CanvasRenderingContext2D, u: number, v: number, size: number): Uint8ClampedArray {
  const { width: w, height: h } = ctx.canvas;
  const s = Math.max(3, Math.round(size));
  const x = Math.min(w - s, Math.max(0, Math.round(u * w - s / 2)));
  const y = Math.min(h - s, Math.max(0, Math.round(v * h - s / 2)));
  return ctx.getImageData(x, y, s, s).data;
}

/** 피부 패치의 평균 인코딩 휘도. 흰색 기준이 피부보다 밝은지 볼 때 쓴다 */
export function skinLuma(ctx: CanvasRenderingContext2D, lm: Point[], w: number, h: number): number {
  const stats = skinPatches(lm, w, h).map((r) => lumaStats(ctx.getImageData(r.x, r.y, r.w, r.h).data).meanLuma);
  return stats.reduce((a, b) => a + b, 0) / Math.max(1, stats.length);
}

/** 양 볼 L* 차이. 한쪽은 빛, 한쪽은 그늘이면 커진다. 어느 쪽이든 못 읽으면 0 */
export function cheekDeltaL(ctx: CanvasRenderingContext2D, lm: Point[], w: number, h: number): number {
  const [l, r] = cheekPatches(lm, w, h).map((p) => representativeLab(ctx.getImageData(p.x, p.y, p.w, p.h).data));
  return l && r ? Math.abs(l.L - r.L) : 0;
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
    cheekDeltaL: cheekDeltaL(ctx, lm, w, h),
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
