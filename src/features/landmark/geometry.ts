import type { Point, Rect } from "@/types/analysis";
import { PATCH_RATIO, SCLERA_PATCH_RATIO } from "@/features/analysis/constants";
import { CHEEK_AXES, EYE_CORNERS, EYE_OUTER_PAIR, IRIS_CENTERS, MOUTH_CENTER, MOUTH_CORNERS, MOUTH_VERTICAL, SKIN_CENTERS } from "./indices";

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

/**
 * 눈 흰자 패치. 홍채 중심과 양쪽 눈꼬리의 중간, 즉 홍채 바로 바깥 흰자에 작은 사각형을 둔다.
 * 홍채 점(468~477)이 없는 모델이면 빈 배열
 */
export function scleraPatches(lm: Point[], w: number, h: number): Rect[] {
  if (lm.length <= Math.max(...IRIS_CENTERS)) return [];
  const size = Math.max(3, Math.round(interocular(lm, w, h) * SCLERA_PATCH_RATIO));
  const irises = IRIS_CENTERS.map((i) => lm[i]);
  return EYE_CORNERS.flatMap((corners) => {
    const mid = { x: (lm[corners[0]].x + lm[corners[1]].x) / 2, y: (lm[corners[0]].y + lm[corners[1]].y) / 2 };
    // 홍채 점의 좌우 번호 규칙에 기대지 않고, 이 눈 가운데에 더 가까운 홍채를 쓴다
    const iris = irises.reduce((best, p) => (Math.hypot(p.x - mid.x, p.y - mid.y) < Math.hypot(best.x - mid.x, best.y - mid.y) ? p : best));
    return corners.map((c) =>
      clampRect(
        { x: ((iris.x + lm[c].x) / 2) * w - size / 2, y: ((iris.y + lm[c].y) / 2) * h - size / 2, w: size, h: size },
        w,
        h,
      ),
    );
  });
}

const px = (p: Point, w: number, h: number): Point => ({ x: p.x * w, y: p.y * h });

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
