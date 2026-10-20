import type { Point, Rect } from "@/types/analysis";
import { IRIS_EXCLUDE_RATIO, PATCH_RATIO } from "@/features/analysis/constants";
import { CHEEK_AXES, CHEEK_PAIR, EYE_CONTOURS, EYE_CORNERS, EYE_OUTER_PAIR, IRISES, LIP_INNER, LIP_OUTER, MOUTH_CENTER, MOUTH_CORNERS, MOUTH_VERTICAL, SKIN_CENTERS } from "./indices";

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

function patchesAt(indices: readonly number[], lm: Point[], w: number, h: number): Rect[] {
  const size = Math.max(4, Math.round(interocular(lm, w, h) * PATCH_RATIO));
  return indices.map((i) => clampRect({ x: lm[i].x * w - size / 2, y: lm[i].y * h - size / 2, w: size, h: size }, w, h));
}

/** 피부 샘플링용 정사각 패치. 폴리곤 대신 랜드마크 중심 사각형이라 순서 문제가 없다. */
export function skinPatches(lm: Point[], w: number, h: number): Rect[] {
  return patchesAt(SKIN_CENTERS, lm, w, h);
}

/** 측면 조명 판정용 [왼볼, 오른볼] 패치 */
export function cheekPatches(lm: Point[], w: number, h: number): Rect[] {
  return patchesAt(CHEEK_PAIR, lm, w, h);
}

const px = (p: Point, w: number, h: number): Point => ({ x: p.x * w, y: p.y * h });

/** 점이 폴리곤 안에 있는지 (ray casting) */
export function inPolygon(x: number, y: number, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** 흰자 후보: 눈 윤곽 폴리곤(픽셀)과 거기서 뺄 홍채 원. 홍채 반지름은 테두리 점 중 가장 먼 거리에 여유를 둔 값 */
export function scleraRegions(lm: Point[], w: number, h: number): { poly: Point[]; hole: { x: number; y: number; r: number } }[] {
  return EYE_CONTOURS.map((contour, k) => {
    const iris = IRISES[k];
    const c = px(lm[iris.center], w, h);
    const r = Math.max(...iris.ring.map((i) => Math.hypot(px(lm[i], w, h).x - c.x, px(lm[i], w, h).y - c.y))) * IRIS_EXCLUDE_RATIO;
    return { poly: contour.map((i) => px(lm[i], w, h)), hole: { x: c.x, y: c.y, r } };
  });
}

/** 입술 바깥 링(픽셀) */
export function lipOuterPolygon(lm: Point[], w: number, h: number): Point[] {
  return LIP_OUTER.map((i) => px(lm[i], w, h));
}

/** 입 안쪽 링(픽셀). 입을 벌리면 치아가 보이는 영역 */
export function mouthInnerPolygon(lm: Point[], w: number, h: number): Point[] {
  return LIP_INNER.map((i) => px(lm[i], w, h));
}

/** 블러셔 기준점: 각 볼의 볼 사과, 광대 바깥쪽, 같은 쪽 눈 가운데 */
export function cheekAnchors(lm: Point[], w: number, h: number): { apple: Point; outer: Point; eye: Point }[] {
  const eyes = EYE_CORNERS.map(([a, b]) => ({ x: ((lm[a].x + lm[b].x) / 2) * w, y: ((lm[a].y + lm[b].y) / 2) * h }));
  return CHEEK_AXES.map(([apple, outer]) => {
    const a = px(lm[apple], w, h);
    // 좌우 번호 규칙에 기대지 않고 이 볼에 더 가까운 눈을 쓴다
    const eye = eyes.reduce((best, e) => (Math.hypot(e.x - a.x, e.y - a.y) < Math.hypot(best.x - a.x, best.y - a.y) ? e : best));
    return { apple: a, outer: px(lm[outer], w, h), eye };
  });
}

/** 입 중심(윗입술·아랫입술 안쪽 중앙의 중점), 입꼬리 사이 폭, 윗입술 위~아랫입술 아래 높이, 기울기(rad) */
export function mouthFrame(lm: Point[], w: number, h: number): { center: Point; width: number; height: number; angle: number } {
  const [l, r] = MOUTH_CORNERS.map((i) => px(lm[i], w, h));
  const [top, bottom] = MOUTH_VERTICAL.map((i) => px(lm[i], w, h));
  const [upper, lower] = MOUTH_CENTER.map((i) => px(lm[i], w, h));
  return {
    center: { x: (upper.x + lower.x) / 2, y: (upper.y + lower.y) / 2 },
    width: Math.hypot(r.x - l.x, r.y - l.y),
    height: Math.hypot(bottom.x - top.x, bottom.y - top.y),
    angle: Math.atan2(r.y - l.y, r.x - l.x),
  };
}

/** 랜드마크 bbox (정규화 좌표 0~1) */
export function faceBounds(lm: Point[]): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  for (const p of lm) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY };
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
