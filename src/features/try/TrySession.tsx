"use client";

import { useEffect, useRef } from "react";
import { PrivacyNote } from "@/components/PrivacyNote";
import { Disclaimer } from "@/components/Disclaimer";
import { LIGHTING_LABELS } from "@/features/analysis/lighting";
import { track } from "@/features/analytics/track";
import { useCameraStream } from "@/features/camera/useCameraStream";
import { ensureVideoMode, useFaceLandmarker } from "@/features/landmark/useFaceLandmarker";
import { useAnalysisStore } from "@/stores/analysisStore";
import { AdvancedPanel } from "./AdvancedPanel";
import { LightingBadges } from "./LightingBadges";
import { ResultPanel } from "./ResultPanel";
import { UploadButton } from "./UploadButton";
import { useIsMobile } from "./useIsMobile";
import { useStillAnalysis } from "./useStillAnalysis";
import { useTryOnLoop } from "./useTryOnLoop";

const CAMERA_MESSAGES = {
  denied: "카메라 권한이 거부됐어요. 브라우저 설정에서 허용하거나, 사진을 올려서 해볼 수 있어요.",
  unavailable: "카메라를 열 수 없어요. 다른 앱이 쓰고 있지 않은지 확인하거나, 사진을 올려서 해볼 수 있어요.",
  unsupported: "이 브라우저는 카메라를 지원하지 않아요. 사진을 올려서 해볼 수 있어요.",
} as const;

const BUTTON = "rounded-full px-5 py-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

export function TrySession() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { status: modelStatus, error: modelError, landmarkerRef, retry } = useFaceLandmarker();
  const isMobile = useIsMobile();
  const camera = useCameraStream(videoRef);
  const still = useStillAnalysis({ canvasRef, landmarkerRef });

  const stage = useAnalysisStore((s) => s.stage);
  const source = useAnalysisStore((s) => s.source);
  const lighting = useAnalysisStore((s) => s.lighting);
  const faceFound = useAnalysisStore((s) => s.faceFound);
  const progress = useAnalysisStore((s) => s.progress);
  const begin = useAnalysisStore((s) => s.begin);
  const startMeasuring = useAnalysisStore((s) => s.startMeasuring);
  const reset = useAnalysisStore((s) => s.reset);

  useTryOnLoop({ videoRef, canvasRef, landmarkerRef, active: camera.status === "active" && source === "camera" });

  const modelReady = modelStatus === "ready";

  const startCamera = async () => {
    still.clear();
    const lm = landmarkerRef.current;
    if (lm) await ensureVideoMode(lm);
    begin("camera");
    track({ name: "try-start", source: "camera" });
    await camera.start();
  };

  const uploadFile = (file: File) => {
    camera.stop();
    track({ name: "try-start", source: "image" });
    void still.analyze(file);
  };

  const restart = () => {
    camera.stop();
    still.clear();
    reset();
  };

  const cameraFailed = camera.status === "denied" || camera.status === "unavailable" || camera.status === "unsupported";
  useEffect(() => {
    if (camera.status === "denied") track({ name: "camera-denied" });
  }, [camera.status]);
  useEffect(() => {
    if (modelStatus === "error") track({ name: "model-error" });
  }, [modelStatus]);
  const showStage = stage !== "setup" && !cameraFailed;

  return (
    <div className="space-y-5">
      {(stage === "setup" || cameraFailed) && (
        <section className="space-y-4">
          <PrivacyNote />
          <p role="status" aria-live="polite" className="text-sm text-muted">
            {modelStatus === "loading" && "얼굴 인식 모듈을 불러오는 중이에요 (최초 1회, 약 10MB)"}
            {modelStatus === "error" && "얼굴 인식 모듈을 불러오지 못했어요. 네트워크를 확인하고 다시 시도해 주세요."}
            {modelReady && "준비됐어요. 자연광 아래, 정면을 비춰 주세요."}
          </p>
          {cameraFailed && (
            <p role="alert" className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
              {CAMERA_MESSAGES[camera.status as keyof typeof CAMERA_MESSAGES]}
            </p>
          )}
          {modelStatus === "error" && (
            <>
              <button type="button" onClick={retry} className={`${BUTTON} border border-line bg-card hover:bg-accent-soft`}>
                다시 시도
              </button>
              {modelError && <p className="break-all font-mono text-xs text-muted">{modelError}</p>}
            </>
          )}
          {/* 모바일은 파일 선택창이 곧 카메라·앨범 선택이라 그걸 기본으로. 실시간 카메라는 보조 */}
          <div className="flex flex-wrap gap-2">
            {isMobile ? (
              <>
                <UploadButton disabled={!modelReady} onFile={uploadFile} variant="primary" label="사진으로 시작하기" />
                {camera.status !== "unsupported" && (
                  <button
                    type="button"
                    onClick={startCamera}
                    disabled={!modelReady || camera.status === "requesting"}
                    className={`${BUTTON} border border-line bg-card hover:bg-accent-soft`}
                  >
                    {camera.status === "requesting" ? "카메라 여는 중…" : "실시간 카메라로"}
                  </button>
                )}
              </>
            ) : (
              <>
                {camera.status !== "unsupported" && (
                  <button
                    type="button"
                    onClick={startCamera}
                    disabled={!modelReady || camera.status === "requesting"}
                    className={`${BUTTON} bg-accent text-white hover:opacity-90`}
                  >
                    {camera.status === "requesting" ? "카메라 여는 중…" : "카메라로 시작"}
                  </button>
                )}
                <UploadButton disabled={!modelReady} onFile={uploadFile} variant={cameraFailed ? "primary" : "secondary"} />
              </>
            )}
          </div>
        </section>
      )}

      <div className={showStage ? "space-y-5" : "hidden"}>
        {/* 아래 색을 고르는 동안 얼굴이 계속 보이게 상단에 고정하고, 높이는 화면 절반 아래로 묶는다 */}
        <div className="sticky top-0 z-10 -mx-4 bg-bg px-4 py-2">
          {/* 캔버스가 레이아웃 크기를 정하고, 비디오는 그 뒤에 깔린다. 전면 카메라는 거울처럼 좌우 반전 */}
          <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-3xl bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`absolute inset-0 h-full w-full object-cover ${source === "camera" ? "-scale-x-100" : ""}`}
            />
            <canvas
              ref={canvasRef}
              aria-label="카메라 미리보기와 립 컬러 체험"
              className={`relative block h-auto max-h-[45svh] w-auto max-w-full md:max-h-[60svh] ${source === "camera" ? "-scale-x-100" : ""}`}
            />
          </div>
        </div>

        {still.error && (
          <p role="alert" className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            {still.error}
          </p>
        )}

        {stage !== "done" && !still.error && <LightingBadges issues={lighting} faceFound={faceFound} />}

        {stage === "live" && source === "camera" && (
          <button type="button" onClick={startMeasuring} disabled={!faceFound} className={`${BUTTON} bg-accent text-white hover:opacity-90`}>
            측정 시작
          </button>
        )}

        {stage === "measuring" && (
          <div role="status" aria-live="polite" className="space-y-2">
            <p className="text-sm">가만히 있어 주세요… {Math.round(progress * 100)}%</p>
            <div className="h-2 overflow-hidden rounded-full bg-black/10">
              <div className="h-full bg-accent transition-[width]" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}

        {stage === "done" && (
          <>
            <ResultPanel />
            {lighting.length > 0 && (
              <p className="text-xs text-muted">조명 참고: {lighting.map((i) => LIGHTING_LABELS[i]).join(", ")} 조건이라 결과가 평소와 다를 수 있어요.</p>
            )}
          </>
        )}

        <AdvancedPanel />
        <div className="flex flex-wrap gap-2">
          <UploadButton disabled={!modelReady} onFile={uploadFile} />
          <button type="button" onClick={restart} className={`${BUTTON} border border-line bg-card hover:bg-accent-soft`}>
            처음으로
          </button>
        </div>
        <Disclaimer />
      </div>
    </div>
  );
}
