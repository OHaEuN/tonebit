"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import type { Point } from "@/types/analysis";
import { createContext, createOffscreen, fitSize, measureLighting, patchAt, sampleSkin, skinLuma, THUMB_SIZE } from "@/features/analysis/frame";
import { STILL_ANALYSIS_WIDTH, WHITE_PATCH_RATIO } from "@/features/analysis/constants";
import { checkWhitePatch } from "@/features/analysis/whitePoint";
import { cameraWhite } from "@/features/analysis/reference";
import { MAX_SHOTS } from "@/features/analysis/shots";
import { detectImage } from "@/features/landmark/useFaceLandmarker";
import { drawOverlays } from "@/features/lipTryOn/render";
import { resolveSwatchHex, useMyShadeStore } from "@/features/myShade/store";
import { track } from "@/features/analytics/track";
import { useAnalysisStore } from "@/stores/analysisStore";
import { loadImage } from "./loadImage";

export const STILL_ERRORS = {
  noFace: "얼굴을 찾지 못했어요. 정면이 잘 보이는 사진으로 다시 올려 주세요",
  noSkin: "피부색을 읽지 못했어요. 더 밝은 사진으로 시도해 주세요",
} as const;

interface Params {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  landmarkerRef: RefObject<FaceLandmarker | null>;
}

/** 결과 화면에서 사진을 고를 때 보여 줄 작은 미리보기 높이(px) */
const THUMB_HEIGHT = 96;

export interface StillPhoto {
  /** 스토어 shot id와 같다 */
  id: number;
  img: HTMLImageElement;
  landmarks: Point[];
  /** 미리보기 data URL */
  thumb: string;
  /** 이용자가 찍은 흰색 기준 자리(정규화 좌표) */
  white?: { u: number; v: number };
}

const WHITE_ERRORS = {
  dark: "피부보다 밝은 흰색(흰 종이·흰 벽·흰 옷)을 눌러 주세요",
  clipped: "너무 밝아서 하얗게 날아간 곳이에요. 조금 덜 밝은 흰색을 눌러 주세요",
  colored: "색이 있는 곳이에요. 흰색이나 밝은 회색을 눌러 주세요",
} as const;

/** 흰색 기준을 찍은 자리 표시 */
function drawWhiteMarker(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.lineWidth = Math.max(2, r / 3);
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1, r / 6);
  ctx.stroke();
  ctx.restore();
}

function makeThumb(img: HTMLImageElement): string {
  const h = THUMB_HEIGHT;
  const w = Math.round((img.naturalWidth / img.naturalHeight) * h);
  const c = createOffscreen(w, h);
  c.drawImage(img, 0, 0, w, h);
  return c.canvas.toDataURL("image/jpeg", 0.7);
}

type AnalyzeOutcome = "ok" | "noFace" | "noSkin";

/**
 * 업로드 사진 분석 + 선택이 바뀔 때마다 정지 화면 다시 그리기.
 * 여러 장을 한 번에 받거나 나중에 더 받아서 합쳐 판정하고, 결과 화면에서 고른 사진을 캔버스에 띄운다
 */
export function useStillAnalysis({ canvasRef, landmarkerRef }: Params) {
  const [photos, setPhotos] = useState<StillPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);

  /** 사진 한 장을 화면 밖 캔버스에서 분석한다. 실패해도 보고 있던 사진·결과는 그대로다 */
  const analyzeOne = useCallback(
    async (file: File): Promise<AnalyzeOutcome> => {
      const lm = landmarkerRef.current;
      if (!lm) return "noFace";
      const store = useAnalysisStore.getState();
      const img = await loadImage(file);
      // 화면 표시보다 큰 해상도로 잰다. 치아·흰자 기준은 픽셀 수가 생명이라
      const { w, h } = fitSize(img.naturalWidth, img.naturalHeight, STILL_ANALYSIS_WIDTH);
      const ctx = createOffscreen(w, h, true);
      ctx.drawImage(img, 0, 0, w, h);

      let points: Point[] | null = null;
      try {
        points = await detectImage(lm, img);
      } catch {
        points = null;
      }
      store.setFaceFound(Boolean(points));
      if (!points) {
        track({ name: "face-not-found", source: "image" });
        return "noFace";
      }
      store.setLighting(measureLighting(ctx, createOffscreen(THUMB_SIZE.w, THUMB_SIZE.h, true), points, w, h));
      const skin = sampleSkin(ctx, points, w, h);
      if (!skin) return "noSkin";
      const id = store.addShot(skin);
      const kept = new Set(useAnalysisStore.getState().shots.map((s) => s.id));
      const photo = { id, img, landmarks: points, thumb: makeThumb(img) };
      setPhotos((prev) => [...prev, photo].filter((p) => kept.has(p.id)));
      return "ok";
    },
    [landmarkerRef],
  );

  /**
   * 사진 여러 장을 차례로 분석해 합친다. append가 아니면 새로 시작한다.
   * 남은 칸(MAX_SHOTS)을 넘는 사진은 버린다
   */
  const analyze = useCallback(
    async (files: File[], append = false) => {
      if (!landmarkerRef.current || !canvasRef.current || files.length === 0) return;
      setError(null);
      if (!append) {
        setPhotos([]);
        useAnalysisStore.getState().begin("image");
      }
      const room = MAX_SHOTS - useAnalysisStore.getState().shots.length;
      const picked = files.slice(0, Math.max(0, room));
      const outcomes: AnalyzeOutcome[] = [];
      for (const f of picked) outcomes.push(await analyzeOne(f));
      const failed = outcomes.filter((o) => o !== "ok").length;
      const dropped = files.length - picked.length;
      const notes: string[] = [];
      if (failed === outcomes.length) notes.push(outcomes.includes("noFace") ? STILL_ERRORS.noFace : STILL_ERRORS.noSkin);
      else if (failed > 0) notes.push(`${outcomes.length}장 중 ${failed}장은 얼굴이나 피부를 찾지 못해 빼고 합쳤어요`);
      if (dropped > 0) notes.push(`한 번에 최대 ${MAX_SHOTS}장까지 합칠 수 있어서 ${dropped}장은 뺐어요`);
      if (notes.length) setError(notes.join(". "));
    },
    [analyzeOne, canvasRef, landmarkerRef],
  );

  /** 사진의 (u, v)를 흰색 기준으로 삼아 그 사진의 피부색을 다시 잰다. 실패하면 안내 문구를 돌려준다 */
  const setWhitePoint = useCallback((id: number, u: number, v: number): string | null => {
    const photo = photos.find((p) => p.id === id);
    if (!photo) return "사진을 찾지 못했어요";
    const { w, h } = fitSize(photo.img.naturalWidth, photo.img.naturalHeight, STILL_ANALYSIS_WIDTH);
    const ctx = createOffscreen(w, h, true);
    ctx.drawImage(photo.img, 0, 0, w, h);
    const check = checkWhitePatch(patchAt(ctx, u, v, w * WHITE_PATCH_RATIO), skinLuma(ctx, photo.landmarks, w, h));
    if ("error" in check) return WHITE_ERRORS[check.error];
    const skin = sampleSkin(ctx, photo.landmarks, w, h, { white: check.white });
    if (!skin || skin.reference !== "white") return "피부색을 다시 읽지 못했어요";
    useAnalysisStore.getState().updateShot(id, { ...skin, whiteFixed: true });
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, white: { u, v } } : p)));
    return null;
  }, [photos]);

  const view = useAnalysisStore((s) => s.view);
  const comparing = useAnalysisStore((s) => s.comparing);
  const lipId = useAnalysisStore((s) => s.lipId);
  const blushId = useAnalysisStore((s) => s.blushId);
  const lipStyle = useAnalysisStore((s) => s.lipStyle);
  const blushStyle = useAnalysisStore((s) => s.blushStyle);
  const lipIntensity = useAnalysisStore((s) => s.lipIntensity);
  const blushIntensity = useAnalysisStore((s) => s.blushIntensity);
  const debug = useAnalysisStore((s) => s.debug);
  const shots = useAnalysisStore((s) => s.shots);
  const myShades = useMyShadeStore((s) => s.shades);

  /** 고른 사진, 합친 결과를 볼 땐 마지막에 올린 사진 */
  const shown = (view !== null ? photos.find((p) => p.id === view) : undefined) ?? photos.at(-1);
  const camera = shots.find((s) => s.id === shown?.id)?.cameraWhite;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!shown || !canvas) return;
    const { img, landmarks } = shown;
    const { w, h } = fitSize(img.naturalWidth, img.naturalHeight);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = createContext(canvas);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(img, 0, 0, w, h);
    if (comparing) return;
    drawOverlays(ctx, createOffscreen(w, h, true), landmarks, w, h, {
      camera: camera ?? cameraWhite(null),
      lip: resolveSwatchHex("lips", lipId),
      blush: resolveSwatchHex("blushes", blushId),
      lipStyle,
      blushStyle,
      lipIntensity,
      blushIntensity,
      debug,
    });
    if (shown.white) drawWhiteMarker(ctx, shown.white.u * w, shown.white.v * h, Math.max(6, w * 0.02));
  }, [canvasRef, shown, camera, comparing, lipId, blushId, lipStyle, blushStyle, lipIntensity, blushIntensity, debug, myShades]);

  const clear = useCallback(() => {
    setPhotos([]);
    setError(null);
  }, []);

  return { analyze, error, clear, photos, shown, setWhitePoint };
}
