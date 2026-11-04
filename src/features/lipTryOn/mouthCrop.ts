import type { FaceSnapshot } from "@/types/analysis";
import type { Finish } from "@/types/product";
import { createOffscreen } from "@/features/analysis/frame";
import { mouthFrame } from "@/features/landmark/geometry";
import { DEFAULT_INTENSITY, drawOverlays, type LipStyle } from "./render";

/** 입 주변을 얼마나 넓게 자를지. 입 폭의 배수 */
const CROP_WIDTH_RATIO = 1.75;
const CROP_ASPECT = 0.8;

/** 제형 → 바르는 방법 */
export function lipStyleOf(finish?: Finish): LipStyle {
  if (finish === "glossy") return "gloss";
  if (finish === "matte") return "matte";
  return "full";
}

/**
 * 얼굴 한 장에 립을 얹고 입 주변만 잘라 낸다. 결과 화면의 "안 어울리는 립 vs 어울리는 립" 비교에 쓴다.
 * 사진은 기기 안에서만 그려지고 어디에도 나가지 않는다
 */
export function renderMouthCrop(snapshot: FaceSnapshot, hex: string | null, finish: Finish | undefined, outWidth: number): HTMLCanvasElement {
  const { width: w, height: h, landmarks } = snapshot;
  const full = createOffscreen(w, h, true);
  full.drawImage(snapshot.image, 0, 0, w, h);
  if (hex) {
    drawOverlays(full, createOffscreen(w, h, true), landmarks, w, h, {
      camera: snapshot.cameraWhite,
      lip: hex,
      blush: null,
      lipStyle: lipStyleOf(finish),
      blushStyle: "cheekbone",
      lipIntensity: DEFAULT_INTENSITY,
      blushIntensity: 0,
      debug: false,
    });
  }
  const m = mouthFrame(landmarks, w, h);
  const cw = Math.min(w, m.width * CROP_WIDTH_RATIO);
  const ch = Math.min(h, cw * CROP_ASPECT);
  const sx = Math.min(w - cw, Math.max(0, m.center.x - cw / 2));
  const sy = Math.min(h - ch, Math.max(0, m.center.y - ch / 2));
  const out = createOffscreen(outWidth, Math.round(outWidth * CROP_ASPECT));
  out.imageSmoothingQuality = "high";
  out.drawImage(full.canvas, sx, sy, cw, ch, 0, 0, out.canvas.width, out.canvas.height);
  return out.canvas;
}
