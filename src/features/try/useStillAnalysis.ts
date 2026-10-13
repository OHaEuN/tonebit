"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import type { Point } from "@/types/analysis";
import { createContext, createOffscreen, fitSize, measureLighting, sampleSkin, THUMB_SIZE } from "@/features/analysis/frame";
import { classifyTone } from "@/features/analysis/tone";
import { detectImage } from "@/features/landmark/useFaceLandmarker";
import { drawOverlays } from "@/features/lipTryOn/render";
import { findSwatchById } from "@/features/recommend/palettes";
import { track } from "@/features/analytics/track";
import { useAnalysisStore } from "@/stores/analysisStore";

export const STILL_ERRORS = {
  noFace: "얼굴을 찾지 못했어요. 정면이 잘 보이는 사진으로 다시 올려 주세요",
  noSkin: "피부색을 읽지 못했어요. 더 밝은 사진으로 시도해 주세요",
} as const;

/** EXIF 회전은 브라우저 기본 image-orientation에 맡긴다 (img로 디코딩해서 캔버스에 그림) */
async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface Params {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  landmarkerRef: RefObject<FaceLandmarker | null>;
}

/** 업로드 사진 1장 분석 + 선택이 바뀔 때마다 정지 화면 다시 그리기 */
export function useStillAnalysis({ canvasRef, landmarkerRef }: Params) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [landmarks, setLandmarks] = useState<Point[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(
    async (file: File) => {
      const lm = landmarkerRef.current;
      const canvas = canvasRef.current;
      if (!lm || !canvas) return;
      const store = useAnalysisStore.getState();
      setError(null);
      setLandmarks(null);
      store.begin("image");

      const img = await loadImage(file);
      const { w, h } = fitSize(img.naturalWidth, img.naturalHeight);
      canvas.width = w;
      canvas.height = h;
      const ctx = createContext(canvas, true);
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
        setError(STILL_ERRORS.noFace);
        return;
      }
      store.setLighting(measureLighting(ctx, createOffscreen(THUMB_SIZE.w, THUMB_SIZE.h, true), points, w, h));
      const lab = sampleSkin(ctx, points, w, h);
      if (!lab) {
        setError(STILL_ERRORS.noSkin);
        return;
      }
      imageRef.current = img;
      setLandmarks(points);
      store.finish(classifyTone(lab));
    },
    [canvasRef, landmarkerRef],
  );

  const lipId = useAnalysisStore((s) => s.lipId);
  const blushId = useAnalysisStore((s) => s.blushId);
  const blend = useAnalysisStore((s) => s.blend);
  const intensity = useAnalysisStore((s) => s.intensity);
  const debug = useAnalysisStore((s) => s.debug);

  useEffect(() => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !landmarks || !canvas) return;
    const { w, h } = fitSize(img.naturalWidth, img.naturalHeight);
    const ctx = createContext(canvas);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(img, 0, 0, w, h);
    drawOverlays(ctx, createOffscreen(w, h), landmarks, w, h, {
      lip: findSwatchById("lips", lipId)?.hex ?? null,
      blush: findSwatchById("blushes", blushId)?.hex ?? null,
      blend,
      intensity,
      debug,
    });
  }, [canvasRef, landmarks, lipId, blushId, blend, intensity, debug]);

  const clear = useCallback(() => {
    imageRef.current = null;
    setLandmarks(null);
    setError(null);
  }, []);

  return { analyze, error, clear };
}
