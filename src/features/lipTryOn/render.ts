import type { Point } from "@/types/analysis";
import { hexToRgb } from "@/features/analysis/color";
import { cheekCenters, interocular, skinPatches } from "@/features/landmark/geometry";
import { LIP_INNER, LIP_OUTER } from "@/features/landmark/indices";

export type BlendPreset = "natural" | "multiply" | "softLight";

/**
 * 블렌딩 프리셋. natural = `color`(소스의 색상·채도 + 배경 명도라 입술 주름이 남음) 위에
 * `multiply`를 얇게 얹어 깊이를 준다. multiply 단독은 파스텔이 탁해지고,
 * soft-light 단독은 진한 색이 잘 안 묻는다. 고급 패널에서 눈으로 비교할 수 있다.
 */
export const BLEND_PRESETS: Record<BlendPreset, { label: string; passes: [GlobalCompositeOperation, number][] }> = {
  natural: { label: "자연스럽게 (color + multiply)", passes: [["color", 0.9], ["multiply", 0.35]] },
  multiply: { label: "multiply", passes: [["multiply", 1]] },
  softLight: { label: "soft-light", passes: [["soft-light", 1]] },
};

/** 진하기 기본값. 틴트 한 번 바른 정도 */
export const DEFAULT_INTENSITY = 0.6;

export interface OverlayOptions {
  lip: string | null;
  blush: string | null;
  blend: BlendPreset;
  /** 0~1. 프리셋 알파에 곱한다 */
  intensity: number;
  debug: boolean;
}

/** 페더링 반경은 얼굴 크기에 비례. 눈 거리 150px이면 약 2px */
const FEATHER_RATIO = 0.015;
const BLUSH_RADIUS_RATIO = 0.3;
const BLUSH_ALPHA = 0.5;

function tracePath(ctx: CanvasRenderingContext2D, lm: Point[], ring: readonly number[], w: number, h: number) {
  ring.forEach((i, k) => {
    const x = lm[i].x * w;
    const y = lm[i].y * h;
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function drawLipMask(mask: CanvasRenderingContext2D, lm: Point[], w: number, h: number, color: string, feather: number) {
  mask.clearRect(0, 0, w, h);
  mask.save();
  mask.fillStyle = color;
  // boolean으로 받아야 TS가 else 분기를 never로 좁히지 않는다
  const supportsFilter: boolean = "filter" in mask;
  if (supportsFilter) {
    mask.filter = `blur(${feather}px)`;
  } else {
    // ponytail: ctx.filter 미지원(구형 Safari)용 shadowBlur 트릭. 도형은 화면 밖에 그리고 그림자만 제자리에 남긴다
    mask.shadowColor = color;
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

function drawBlush(ctx: CanvasRenderingContext2D, lm: Point[], w: number, h: number, color: string, radius: number, intensity: number) {
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  for (const c of cheekCenters(lm, w, h)) {
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, radius);
    g.addColorStop(0, hexToRgba(color, BLUSH_ALPHA * intensity));
    g.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(c.x - radius, c.y - radius, radius * 2, radius * 2);
  }
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

/** 소스(비디오/이미지)가 이미 그려진 ctx 위에 립·블러셔·디버그를 얹는다 */
export function drawOverlays(
  ctx: CanvasRenderingContext2D,
  mask: CanvasRenderingContext2D,
  lm: Point[],
  w: number,
  h: number,
  opts: OverlayOptions,
) {
  const unit = interocular(lm, w, h);
  if (opts.blush) drawBlush(ctx, lm, w, h, opts.blush, unit * BLUSH_RADIUS_RATIO, opts.intensity);
  if (opts.lip) {
    drawLipMask(mask, lm, w, h, opts.lip, Math.max(1, unit * FEATHER_RATIO));
    ctx.save();
    for (const [op, alpha] of BLEND_PRESETS[opts.blend].passes) {
      ctx.globalCompositeOperation = op;
      ctx.globalAlpha = alpha * opts.intensity;
      ctx.drawImage(mask.canvas, 0, 0);
    }
    ctx.restore();
  }
  if (opts.debug) drawDebug(ctx, lm, w, h);
}
