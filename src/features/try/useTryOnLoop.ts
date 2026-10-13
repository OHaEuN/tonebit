"use client";

import { useEffect, type RefObject } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import type { Lab } from "@/types/analysis";
import { MEASURE_FRAMES } from "@/features/analysis/constants";
import { createContext, createOffscreen, fitSize, measureLighting, sampleSkin, THUMB_SIZE } from "@/features/analysis/frame";
import { medianLab } from "@/features/analysis/sample";
import { classifyTone } from "@/features/analysis/tone";
import { drawOverlays } from "@/features/lipTryOn/render";
import { findSwatchById } from "@/features/recommend/palettes";
import { useAnalysisStore } from "@/stores/analysisStore";

const LIGHTING_EVERY_N_FRAMES = 10;
const FPS_WINDOW_MS = 1000;

interface Params {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  landmarkerRef: RefObject<FaceLandmarker | null>;
  active: boolean;
}

/**
 * 카메라 프레임 루프. 매 프레임: 랜드마크 → 비디오 그리기 → (단계별) 조명 체크·피부 샘플링 → 립·블러셔 오버레이.
 * 프레임이 밀리면 큐에 쌓지 않고 건너뛴다. 스토어는 getState()로 읽어 루프를 재시작하지 않는다.
 */
export function useTryOnLoop({ videoRef, canvasRef, landmarkerRef, active }: Params) {
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!active || !video || !canvas) return;

    const ctx = createContext(canvas, true);
    const thumb = createOffscreen(THUMB_SIZE.w, THUMB_SIZE.h, true);
    let mask: CanvasRenderingContext2D | null = null;
    let raf = 0;
    let lastTime = -1;
    let frame = 0;
    let samples: Lab[] = [];
    let fpsCount = 0;
    let fpsAt = performance.now();

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const lm = landmarkerRef.current;
      if (!lm || video.readyState < 2 || video.currentTime === lastTime) return;
      lastTime = video.currentTime;
      frame++;

      const { w, h } = fitSize(video.videoWidth, video.videoHeight);
      if (!mask || canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        mask = createOffscreen(w, h);
      }

      const landmarks = lm.detectForVideo(video, performance.now()).faceLandmarks[0] ?? null;
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.drawImage(video, 0, 0, w, h);

      const store = useAnalysisStore.getState();
      if (store.faceFound !== Boolean(landmarks)) store.setFaceFound(Boolean(landmarks));
      if (landmarks) {
        if (store.stage === "live" && frame % LIGHTING_EVERY_N_FRAMES === 0) {
          store.setLighting(measureLighting(ctx, thumb, landmarks, w, h));
        }
        if (store.stage === "measuring") {
          const lab = sampleSkin(ctx, landmarks, w, h);
          if (lab) samples.push(lab);
          store.setProgress(samples.length / MEASURE_FRAMES);
          if (samples.length >= MEASURE_FRAMES) {
            store.finish(classifyTone(medianLab(samples)));
            samples = [];
          }
        }
        drawOverlays(ctx, mask, landmarks, w, h, {
          lip: findSwatchById("lips", store.lipId)?.hex ?? null,
          blush: findSwatchById("blushes", store.blushId)?.hex ?? null,
          blend: store.blend,
          intensity: store.intensity,
          debug: store.debug,
        });
      }

      fpsCount++;
      const now = performance.now();
      if (now - fpsAt >= FPS_WINDOW_MS) {
        store.setFps(Math.round((fpsCount * 1000) / (now - fpsAt)));
        fpsCount = 0;
        fpsAt = now;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, videoRef, canvasRef, landmarkerRef]);
}
