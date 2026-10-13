import type { Point, Rect } from "@/types/analysis";
import { PATCH_RATIO } from "@/features/analysis/constants";
import { CHEEK_CENTERS, EYE_OUTER_PAIR, SKIN_CENTERS } from "./indices";

/** 눈 바깥꼬리 사이 픽셀 거리. 얼굴 크기 기준 단위. */
export function interocular(lm: Point[], w: number, h: number): number {
  const [a, b] = EYE_OUTER_PAIR.map((i) => lm[i]);
  return Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);
}

function clampRect(r: Rect, w: number, h: number): Rect {
  const x = Math.max(0, Math.min(r.x, w - r.w));
  const y = Math.max(0, Math.min(r.y, h - r.h));
  return { x: Math.round(x), y: Math.round(y), w: r.w, h: r.h };
}

/** 피부 샘플링용 정사각 패치. 폴리곤 대신 랜드마크 중심 사각형이라 순서 문제가 없다. */
export function skinPatches(lm: Point[], w: number, h: number): Rect[] {
  const size = Math.max(4, Math.round(interocular(lm, w, h) * PATCH_RATIO));
  return SKIN_CENTERS.map((i) =>
    clampRect({ x: lm[i].x * w - size / 2, y: lm[i].y * h - size / 2, w: size, h: size }, w, h),
  );
}

export function cheekCenters(lm: Point[], w: number, h: number): Point[] {
  return CHEEK_CENTERS.map((i) => ({ x: lm[i].x * w, y: lm[i].y * h }));
}

/** 얼굴 bbox 폭 / 프레임 폭 */
export function faceWidthRatio(lm: Point[]): number {
  let min = 1;
  let max = 0;
  for (const p of lm) {
    if (p.x < min) min = p.x;
    if (p.x > max) max = p.x;
  }
  return Math.max(0, max - min);
}
