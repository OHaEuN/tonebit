import type { FaceSnapshot } from "@/types/analysis";
import type { Finish } from "@/types/product";
import { createOffscreen } from "@/features/analysis/frame";
import { faceBounds } from "@/features/landmark/geometry";
import { DEFAULT_INTENSITY, drawOverlays, lipStyleOf } from "./render";

/** 얼굴 양옆 여백. 얼굴 폭의 비율 */
const SIDE_PAD = 0.3;
/** 자른 그림의 가로/세로. 세로가 긴 인물 사진 비율 */
export const CROP_ASPECT = 4 / 5;
/** 위아래 남는 여백 중 위쪽(머리)에 두는 몫. 랜드마크가 이마 위까지만 잡아서 머리가 잘리지 않게 위를 더 준다 */
const TOP_SHARE = 0.6;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * 얼굴 한 장에 립을 얹고 얼굴 전체를 잘라 낸다. 결과 화면의 "안 어울리는 립 vs 어울리는 립" 비교에 쓴다.
 * 입술만 보면 색 차이만 보이고, 얼굴 전체로 봐야 피부가 맑아 보이는지 칙칙해 보이는지가 드러난다.
 * 사진은 기기 안에서만 그려지고 어디에도 나가지 않는다
 */
export function renderFaceCrop(snapshot: FaceSnapshot, hex: string | null, finish: Finish | undefined, outWidth: number): HTMLCanvasElement {
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
  const b = faceBounds(landmarks);
  const fw = (b.maxX - b.minX) * w;
  const fh = (b.maxY - b.minY) * h;
  let cw = Math.min(w, fw * (1 + 2 * SIDE_PAD));
  let ch = cw / CROP_ASPECT;
  if (ch > h) {
    ch = h;
    cw = ch * CROP_ASPECT;
  }
  const sx = clamp(b.minX * w - (cw - fw) / 2, 0, w - cw);
  const sy = clamp(b.minY * h - (ch - fh) * TOP_SHARE, 0, h - ch);
  const out = createOffscreen(outWidth, Math.round(outWidth / CROP_ASPECT));
  out.imageSmoothingQuality = "high";
  out.drawImage(full.canvas, sx, sy, cw, ch, 0, 0, out.canvas.width, out.canvas.height);
  return out.canvas;
}
