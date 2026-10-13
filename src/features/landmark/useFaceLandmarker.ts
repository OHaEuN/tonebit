"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

export type LandmarkerStatus = "loading" | "ready" | "error";

/** 모델·wasm은 같은 오리진에서만 받는다. CSP connect-src 'self'로 강제됨 */
/** 버전별 경로라 배포가 바뀌어도 immutable 캐시에 남은 예전 파일을 쓰지 않는다 (scripts/copy-wasm.mjs) */
const WASM_PATH = `/wasm/${process.env.NEXT_PUBLIC_MEDIAPIPE_VERSION}`;
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

/**
 * tasks-vision은 wasm 로더를 <script>로 붙이고, 실패하면 Error가 아닌 Event로 reject한다.
 * 화면에 "[object Event]" 대신 어떤 파일이 어떤 상태로 실패했는지 보여준다
 */
async function describeLoadError(e: unknown): Promise<string> {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  const src = typeof Event !== "undefined" && e instanceof Event && e.target instanceof HTMLScriptElement ? e.target.src : null;
  if (!src) return String(e);
  const path = new URL(src).pathname;
  try {
    const res = await fetch(src, { method: "HEAD", cache: "no-store" });
    return `스크립트 로드 실패: ${path} (HTTP ${res.status}, ${res.headers.get("content-type") ?? "type 없음"})`;
  } catch {
    return `스크립트 로드 실패: ${path} (네트워크 오류)`;
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
      .catch(async (e: unknown) => {
        console.error("[landmarker] load failed", e);
        const message = await describeLoadError(e);
        if (disposed) return;
        setError(message);
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
