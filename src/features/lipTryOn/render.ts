import type { LinearRgb, Point, Rect } from "@/types/analysis";
import { hexToRgb } from "@/features/analysis/color";
import { cheekAnchors, interocular, lipOuterPolygon, mouthFrame, skinPatches } from "@/features/landmark/geometry";
import { LIP_INNER, LIP_OUTER } from "@/features/landmark/indices";
import { hexToLinear, tintPixels } from "./tint";

export type LipStyle = "full" | "gradient" | "gloss" | "matte";
export type BlushStyle = "cheekbone" | "apple" | "underEye";

/** 바르는 방법별 발색. coverage는 입술색을 덮는 정도, texture는 입술 결(명암)을 남기는 정도 */
interface LipStyleSpec {
  label: string;
  coverage: number;
  texture: number;
}

/**
 * 립 바르는 방법. 값은 제형별 안료 함량(시어 5% 미만, 보통 5~10%, 진한 립 10~15%)의 순서만 반영한 출발값이라
 * 같은 제품의 바르기 전·후 사진으로 다시 맞춰야 한다
 */
export const LIP_STYLES: Record<LipStyle, LipStyleSpec> = {
  full: { label: "풀립", coverage: 0.8, texture: 0.7 },
  /** 안쪽은 진하고 바깥으로 갈수록 풀리는 그라데이션 립 */
  gradient: { label: "그라데이션", coverage: 0.85, texture: 0.7 },
  /** 얇게 비치고 입술 결과 광이 그대로 남는다. 아랫입술에 광을 더 올린다 */
  gloss: { label: "글로시", coverage: 0.5, texture: 1 },
  /** 거의 다 덮고 결을 눌러 보송하게 */
  matte: { label: "매트", coverage: 0.95, texture: 0.35 },
};

/**
 * 블러셔 바르는 방법. 모양은 눈 거리 대비 타원 반지름(rx·ry)이고, 자리는 스타일별로 볼 기준점에서 옮긴다
 */
export const BLUSH_STYLES: Record<BlushStyle, { label: string; rx: number; ry: number }> = {
  /** 광대를 따라 비스듬히 길게. 윤곽이 살아 보인다 */
  cheekbone: { label: "광대", rx: 0.27, ry: 0.15 },
  /** 볼 사과에 동그랗게. 생기 있고 어려 보인다 */
  apple: { label: "애플존", rx: 0.19, ry: 0.16 },
  /** 눈 바로 아래에 가로로 넓게. 숙취 블러셔 */
  underEye: { label: "언더아이", rx: 0.28, ry: 0.11 },
};
/** 블러셔는 얇은 가루라 피부색이 많이 비치고 피부 결은 다 남는다 */
const BLUSH_COVERAGE = 0.45;
const BLUSH_TEXTURE = 1;

/** 진하기 기본값. 틴트 한 번 바른 정도 */
export const DEFAULT_INTENSITY = 0.6;

export interface OverlayOptions {
  /** 이 사진에서 완전한 흰색이 찍혔을 선형 RGB(측정 결과). 제품 색을 사진 조명에 맞춘다 */
  camera: LinearRgb;
  lip: string | null;
  blush: string | null;
  lipStyle: LipStyle;
  blushStyle: BlushStyle;
  /** 0~1. 각 스타일의 합성 알파에 곱한다 */
  lipIntensity: number;
  blushIntensity: number;
  debug: boolean;
}

/** 페더링 반경은 얼굴 크기에 비례. 눈 거리 150px이면 약 2px */
const FEATHER_RATIO = 0.015;

function tracePath(ctx: CanvasRenderingContext2D, lm: Point[], ring: readonly number[], w: number, h: number) {
  ring.forEach((i, k) => {
    const x = lm[i].x * w;
    const y = lm[i].y * h;
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

/** 마스크는 알파만 쓴다 */
const MASK_COLOR = "#000000";

function drawLipMask(mask: CanvasRenderingContext2D, lm: Point[], w: number, h: number, feather: number) {
  mask.clearRect(0, 0, w, h);
  mask.save();
  mask.fillStyle = MASK_COLOR;
  // boolean으로 받아야 TS가 else 분기를 never로 좁히지 않는다
  const supportsFilter: boolean = "filter" in mask;
  if (supportsFilter) {
    mask.filter = `blur(${feather}px)`;
  } else {
    // ponytail: ctx.filter 미지원(구형 Safari)용 shadowBlur 트릭. 도형은 화면 밖에 그리고 그림자만 제자리에 남긴다
    mask.shadowColor = MASK_COLOR;
    mask.shadowBlur = feather * 2;
    mask.shadowOffsetX = w * 2;
    mask.translate(-w * 2, 0);
  }
  mask.beginPath();
  tracePath(mask, lm, LIP_OUTER, w, h);
  tracePath(mask, lm, LIP_INNER, w, h);
  mask.fill("evenodd");
  mask.restore();
}

function hexToRgba(hex: string, alpha: number): string {
  return `rgba(${hexToRgb(hex).join(", ")}, ${alpha})`;
}

/** box 안 픽셀에 마스크 알파만큼 제품을 바른다 */
function tintRegion(ctx: CanvasRenderingContext2D, mask: CanvasRenderingContext2D, box: Rect, spec: Parameters<typeof tintPixels>[2]) {
  if (box.w <= 0 || box.h <= 0) return;
  const img = ctx.getImageData(box.x, box.y, box.w, box.h);
  tintPixels(img.data, mask.getImageData(box.x, box.y, box.w, box.h).data, spec);
  ctx.putImageData(img, box.x, box.y);
}

/** 점들을 감싸는 사각형에 여백을 두고 캔버스 안으로 자른다 */
function boundingBox(points: Point[], pad: number, w: number, h: number): Rect {
  const x0 = Math.max(0, Math.floor(Math.min(...points.map((p) => p.x)) - pad));
  const y0 = Math.max(0, Math.floor(Math.min(...points.map((p) => p.y)) - pad));
  const x1 = Math.min(w, Math.ceil(Math.max(...points.map((p) => p.x)) + pad));
  const y1 = Math.min(h, Math.ceil(Math.max(...points.map((p) => p.y)) + pad));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** 타원 하나에 가우시안에 가까운 감쇠로 색을 칠한다. stops는 [위치, 알파] */
function softEllipse(
  c: CanvasRenderingContext2D,
  at: Point,
  angle: number,
  rx: number,
  ry: number,
  color: string,
  stops: [number, number][] = [[0, 1], [0.3, 0.8], [0.6, 0.4], [0.85, 0.12], [1, 0]],
) {
  c.save();
  c.translate(at.x, at.y);
  c.rotate(angle);
  c.scale(rx, ry);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (const [t, a] of stops) g.addColorStop(t, hexToRgba(color, a));
  c.fillStyle = g;
  c.fillRect(-1, -1, 2, 2);
  c.restore();
}

/** 스타일별 블러셔 타원 자리와 기울기. eyeLine은 두 눈을 잇는 선의 기울기(고개 기울기) */
function blushPlacement(style: BlushStyle, cheek: { apple: Point; outer: Point; eye: Point }, eyeLine: number): { at: Point; angle: number } {
  const { apple, outer, eye } = cheek;
  const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const toOuter = Math.atan2(outer.y - apple.y, outer.x - apple.x);
  if (style === "cheekbone") return { at: lerp(apple, outer, 0.25), angle: toOuter };
  if (style === "apple") return { at: lerp(apple, outer, 0.05), angle: toOuter };
  // 언더아이: 볼 사과에서 눈 쪽으로 올리고, 눈 높이선과 나란히 눕힌다
  return { at: lerp(apple, eye, 0.42), angle: eyeLine };
}

/**
 * 블러셔. 동그란 도장 대신 스타일별 타원에 가장자리가 길게 풀리는 그라데이션 마스크를 그리고, 그 알파만큼 피부에 얇게 바른다
 */
function drawBlush(
  ctx: CanvasRenderingContext2D,
  mask: CanvasRenderingContext2D,
  lm: Point[],
  w: number,
  h: number,
  color: string,
  style: BlushStyle,
  unit: number,
  strength: number,
  camera: LinearRgb,
) {
  const { rx, ry } = BLUSH_STYLES[style];
  mask.clearRect(0, 0, w, h);
  const cheeks = cheekAnchors(lm, w, h);
  const [e0, e1] = cheeks.map((c) => c.eye);
  const eyeLine = Math.atan2(e1.y - e0.y, e1.x - e0.x);
  const centers: Point[] = [];
  for (const cheek of cheeks) {
    const { at, angle } = blushPlacement(style, cheek, eyeLine);
    softEllipse(mask, at, angle, unit * rx, unit * ry, MASK_COLOR);
    centers.push(at);
  }
  tintRegion(ctx, mask, boundingBox(centers, unit * Math.max(rx, ry), w, h), {
    color: hexToLinear(color),
    camera,
    coverage: BLUSH_COVERAGE,
    texture: BLUSH_TEXTURE,
    strength,
  });
}

/** 그라데이션 립: 입술 마스크에서 입 중심 타원 밖을 지워 안쪽만 진하게 남긴다 */
function fadeLipEdges(mask: CanvasRenderingContext2D, lm: Point[], w: number, h: number) {
  const m = mouthFrame(lm, w, h);
  mask.save();
  mask.globalCompositeOperation = "destination-in";
  softEllipse(mask, m.center, m.angle, m.width * 0.42, m.height * 0.62, "#000000", [[0, 1], [0.35, 0.95], [0.7, 0.45], [1, 0]]);
  mask.restore();
}

/** 글로시: 아랫입술 가운데에 흰 광을 얹는다. 입술 모양 밖으로는 안 나가게 자른다 */
function drawGloss(ctx: CanvasRenderingContext2D, lm: Point[], w: number, h: number, intensity: number) {
  const m = mouthFrame(lm, w, h);
  const at = { x: m.center.x + Math.sin(-m.angle) * m.height * 0.22, y: m.center.y + Math.cos(m.angle) * m.height * 0.22 };
  ctx.save();
  ctx.beginPath();
  tracePath(ctx, lm, LIP_OUTER, w, h);
  tracePath(ctx, lm, LIP_INNER, w, h);
  ctx.clip("evenodd");
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.55 * Math.min(1, intensity + 0.2);
  softEllipse(ctx, at, m.angle, m.width * 0.16, m.height * 0.09, "#ffffff", [[0, 1], [0.5, 0.5], [1, 0]]);
  ctx.restore();
}

function drawDebug(ctx: CanvasRenderingContext2D, lm: Point[], w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = "#00e5ff";
  ctx.lineWidth = 1;
  for (const r of skinPatches(lm, w, h)) ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.beginPath();
  tracePath(ctx, lm, LIP_OUTER, w, h);
  tracePath(ctx, lm, LIP_INNER, w, h);
  ctx.stroke();
  ctx.fillStyle = "#ffea00";
  for (const p of lm) ctx.fillRect(p.x * w - 0.5, p.y * h - 0.5, 1, 1);
  ctx.restore();
}

/** 소스(비디오/이미지)가 이미 그려진 ctx 위에 립·블러셔·디버그를 얹는다. mask는 픽셀을 읽으므로 willReadFrequently로 만든다 */
export function drawOverlays(
  ctx: CanvasRenderingContext2D,
  mask: CanvasRenderingContext2D,
  lm: Point[],
  w: number,
  h: number,
  opts: OverlayOptions,
) {
  const unit = interocular(lm, w, h);
  if (opts.blush) drawBlush(ctx, mask, lm, w, h, opts.blush, opts.blushStyle, unit, opts.blushIntensity, opts.camera);
  if (opts.lip) {
    const feather = Math.max(1, unit * FEATHER_RATIO);
    drawLipMask(mask, lm, w, h, feather);
    if (opts.lipStyle === "gradient") fadeLipEdges(mask, lm, w, h);
    const { coverage, texture } = LIP_STYLES[opts.lipStyle];
    tintRegion(ctx, mask, boundingBox(lipOuterPolygon(lm, w, h), feather * 3, w, h), {
      color: hexToLinear(opts.lip),
      camera: opts.camera,
      coverage,
      texture,
      strength: opts.lipIntensity,
    });
    if (opts.lipStyle === "gloss") drawGloss(ctx, lm, w, h, opts.lipIntensity);
  }
  if (opts.debug) drawDebug(ctx, lm, w, h);
}
