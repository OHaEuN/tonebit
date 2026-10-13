"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

export type LandmarkerStatus = "loading" | "ready" | "error";

/** 모델·wasm은 같은 오리진에서만 받는다. CSP connect-src 'self'로 강제됨 */
const WASM_PATH = "/wasm";
const MODEL_PATH = "/models/face_landmarker.task";

async function loadLandmarker(): Promise<FaceLandmarker> {
  const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
  const create = (delegate: "GPU" | "CPU") =>
    FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_PATH, delegate },
      runningMode: "VIDEO",
      numFaces: 1,
    });
  try {
    return await create("GPU");
  } catch {
    return create("CPU");
  }
}

/** tasks-vision을 이 훅이 마운트될 때 처음 내려받는다 (랜딩 페이지엔 포함되지 않음). */
export function useFaceLandmarker() {
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const [status, setStatus] = useState<LandmarkerStatus>("loading");
  /** 실패 원인. 기기에서 콘솔을 못 보는 사용자가 화면에서 읽을 수 있게 */
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setStatus("loading");
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let disposed = false;
    loadLandmarker()
      .then((lm) => {
        if (disposed) {
          lm.close();
          return;
        }
        landmarkerRef.current = lm;
        setStatus("ready");
      })
      .catch((e: unknown) => {
        console.error("[landmarker] load failed", e);
        setError(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
        setStatus("error");
      });
    return () => {
      disposed = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [attempt]);

  return { status, error, landmarkerRef, retry };
}

const modes = new WeakMap<FaceLandmarker, "IMAGE" | "VIDEO">();

/** 정지 이미지 1장 감지. 모드 전환은 그래프를 다시 올리므로 바뀔 때만 한다 */
export async function detectImage(lm: FaceLandmarker, img: HTMLImageElement) {
  if (modes.get(lm) !== "IMAGE") {
    await lm.setOptions({ runningMode: "IMAGE" });
    modes.set(lm, "IMAGE");
  }
  return lm.detect(img).faceLandmarks[0] ?? null;
}

export async function ensureVideoMode(lm: FaceLandmarker) {
  if (modes.get(lm) === "IMAGE") {
    await lm.setOptions({ runningMode: "VIDEO" });
    modes.set(lm, "VIDEO");
  }
}
