"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

export type LandmarkerStatus = "loading" | "ready" | "error";

/** 모델·wasm은 같은 오리진에서만 받는다. CSP connect-src 'self'로 강제됨 */
/** 버전별 경로라 배포가 바뀌어도 immutable 캐시에 남은 예전 파일을 쓰지 않는다 (scripts/copy-wasm.mjs) */
const WASM_PATH = `/wasm/${process.env.NEXT_PUBLIC_MEDIAPIPE_VERSION}`;
const MODEL_PATH = "/models/face_landmarker.task";

/** 로딩 진행 상황. download는 wasm·모델을 받는 중, init은 받은 걸로 엔진을 올리는 중 */
export interface LoadProgress {
  phase: "download" | "init";
  /** 0~1. 크기를 모를 땐 추정치 기준 */
  ratio: number;
  loadedBytes: number;
  totalBytes: number;
}

/** Content-Length를 못 믿을 때(압축 전송) 쓰는 대략적인 크기 */
const ESTIMATED_BYTES = { wasm: 13_000_000, model: 3_800_000 };

/** 받은 바이트 수를 알려주며 내려받는다. 압축 전송이면 Content-Length가 실제보다 작아 추정치를 쓴다 */
async function fetchWithProgress(url: string, estimate: number, onBytes: (loaded: number, total: number) => void): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${new URL(url, location.href).pathname} 내려받기 실패 (HTTP ${res.status})`);
  const length = Number(res.headers.get("content-length"));
  const total = length > 0 && !res.headers.get("content-encoding") ? length : estimate;
  if (!res.body) {
    const buf = new Uint8Array(await res.arrayBuffer());
    onBytes(buf.byteLength, buf.byteLength);
    return buf;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onBytes(loaded, Math.max(total, loaded));
  }
  onBytes(loaded, loaded);
  const out = new Uint8Array(loaded);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

async function loadLandmarker(onProgress: (p: LoadProgress) => void): Promise<FaceLandmarker> {
  const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

  // wasm과 모델을 같이 받으며 진행률을 낸다. wasm은 여기서 HTTP 캐시에 올려두고 tasks-vision이 다시 요청할 때 캐시에서 꺼내 쓴다
  const progress = { wasm: [0, ESTIMATED_BYTES.wasm], model: [0, ESTIMATED_BYTES.model] };
  const report = () => {
    const loadedBytes = progress.wasm[0] + progress.model[0];
    const totalBytes = progress.wasm[1] + progress.model[1];
    onProgress({ phase: "download", ratio: Math.min(1, loadedBytes / totalBytes), loadedBytes, totalBytes });
  };
  const [, model] = await Promise.all([
    fetchWithProgress(vision.wasmBinaryPath, ESTIMATED_BYTES.wasm, (l, t) => {
      progress.wasm = [l, t];
      report();
    }),
    fetchWithProgress(MODEL_PATH, ESTIMATED_BYTES.model, (l, t) => {
      progress.model = [l, t];
      report();
    }),
  ]);
  const totalBytes = progress.wasm[1] + progress.model[1];
  onProgress({ phase: "init", ratio: 1, loadedBytes: totalBytes, totalBytes });

  const create = (delegate: "GPU" | "CPU") =>
    FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetBuffer: model, delegate },
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

/**
 * MediaPipe WASM은 정보·경고 로그(glog: "INFO: …", "I1020 …", "W1020 …")를 console.error로 찍는다.
 * Next 개발 화면이 이걸 오류로 띄우지 않게 그 줄만 console.debug로 돌린다. 진짜 오류(E 레벨)는 그대로 둔다
 */
let quieted = false;
function quietMediapipeLogs() {
  if (quieted) return;
  quieted = true;
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === "string" && /^(INFO: |[IW]\d{4} )/.test(first)) {
      console.debug(...args);
      return;
    }
    original(...args);
  };
}

/** 받는 중인 진행률을 지금 마운트된 화면들에 나눠 준다 */
const progressListeners = new Set<(p: LoadProgress) => void>();
/**
 * 랜드마커는 한 번만 만들어 페이지를 오가도 다시 쓴다. 개발 모드(StrictMode)에서 두 번 만들고 하나를 닫던 낭비도 없앤다.
 * ponytail: 체험 페이지를 떠나도 WASM 메모리(수십 MB)를 쥐고 있다. 메모리가 문제 되면 마지막 구독이 끝날 때 닫는다
 */
let shared: Promise<FaceLandmarker> | null = null;
function sharedLandmarker(): Promise<FaceLandmarker> {
  quietMediapipeLogs();
  shared ??= loadLandmarker((p) => progressListeners.forEach((listener) => listener(p))).catch((e: unknown) => {
    shared = null;
    throw e;
  });
  return shared;
}

/** tasks-vision을 이 훅이 마운트될 때 처음 내려받는다 (랜딩 페이지엔 포함되지 않음). */
export function useFaceLandmarker() {
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const [status, setStatus] = useState<LandmarkerStatus>("loading");
  /** 실패 원인. 기기에서 콘솔을 못 보는 사용자가 화면에서 읽을 수 있게 */
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setStatus("loading");
    setError(null);
    setProgress(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let disposed = false;
    // 바이트마다 렌더하지 않게 퍼센트가 바뀔 때만 상태를 올린다
    let lastKey = "";
    const onProgress = (p: LoadProgress) => {
      const key = `${p.phase}:${Math.floor(p.ratio * 100)}`;
      if (disposed || key === lastKey) return;
      lastKey = key;
      setProgress(p);
    };
    progressListeners.add(onProgress);
    sharedLandmarker()
      .then((lm) => {
        if (disposed) return;
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
      progressListeners.delete(onProgress);
      landmarkerRef.current = null;
    };
  }, [attempt]);

  return { status, error, progress, landmarkerRef, retry };
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
