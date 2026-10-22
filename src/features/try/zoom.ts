/**
 * 전체 화면 사진 뷰어의 확대·이동 계산. 화면 좌표(px)에서 transform: translate(x, y) scale(s) (원점 왼쪽 위)를 다룬다.
 * 사진은 뷰포트 안에 contain으로 맞춘 크기(base)에서 시작한다
 */
export interface View {
  scale: number;
  x: number;
  y: number;
}

export interface Box {
  w: number;
  h: number;
}

export const MIN_SCALE = 1;
export const MAX_SCALE = 6;
export const DOUBLE_TAP_SCALE = 2.5;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 사진이 뷰포트보다 크면 가장자리가 안쪽으로 들어오지 않게, 작으면 가운데에 둔다 */
export function clampView(v: View, base: Box, viewport: Box): View {
  const scale = clamp(v.scale, MIN_SCALE, MAX_SCALE);
  const w = base.w * scale;
  const h = base.h * scale;
  const x = w <= viewport.w ? (viewport.w - w) / 2 : clamp(v.x, viewport.w - w, 0);
  const y = h <= viewport.h ? (viewport.h - h) / 2 : clamp(v.y, viewport.h - h, 0);
  return { scale, x, y };
}

/** 처음 열 때: 확대 없이 가운데 */
export function fitView(base: Box, viewport: Box): View {
  return clampView({ scale: 1, x: 0, y: 0 }, base, viewport);
}

/** 화면의 한 점(focus)을 고정한 채 배율을 바꾼다. 핀치·더블탭·휠 모두 이걸 쓴다 */
export function zoomAt(v: View, nextScale: number, focus: { x: number; y: number }, base: Box, viewport: Box): View {
  const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
  const k = scale / v.scale;
  return clampView({ scale, x: focus.x - (focus.x - v.x) * k, y: focus.y - (focus.y - v.y) * k }, base, viewport);
}

/** 더블탭: 확대돼 있으면 맞춤으로, 아니면 누른 곳을 DOUBLE_TAP_SCALE로 */
export function toggleZoom(v: View, focus: { x: number; y: number }, base: Box, viewport: Box): View {
  return v.scale > MIN_SCALE + 0.01 ? fitView(base, viewport) : zoomAt(v, DOUBLE_TAP_SCALE, focus, base, viewport);
}

/** 사진 원래 비율로 뷰포트에 contain한 크기 */
export function containSize(img: Box, viewport: Box): Box {
  const s = Math.min(viewport.w / img.w, viewport.h / img.h);
  return { w: img.w * s, h: img.h * s };
}

/** 정규화 좌표 상자(얼굴 등)가 뷰포트 폭의 fill만큼 차도록 확대하고 가운데에 둔다 */
export function frameBox(
  box: { minX: number; maxX: number; minY: number; maxY: number },
  base: Box,
  viewport: Box,
  fill = 0.8,
): View {
  const bw = (box.maxX - box.minX) * base.w;
  const bh = (box.maxY - box.minY) * base.h;
  if (!(bw > 0) || !(bh > 0)) return fitView(base, viewport);
  const scale = clamp(Math.min((viewport.w * fill) / bw, (viewport.h * fill) / bh), MIN_SCALE, MAX_SCALE);
  const cx = ((box.minX + box.maxX) / 2) * base.w;
  const cy = ((box.minY + box.maxY) / 2) * base.h;
  return clampView({ scale, x: viewport.w / 2 - cx * scale, y: viewport.h / 2 - cy * scale }, base, viewport);
}
