"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Disclaimer } from "@/components/Disclaimer";
import { BUTTON } from "@/components/styles";
import { LIGHTING_LABELS } from "@/features/analysis/lighting";
import { REFERENCE_LABEL } from "@/features/analysis/reference";
import { isFullyCorrected } from "@/features/analysis/tone";
import { track } from "@/features/analytics/track";
import { useCameraStream } from "@/features/camera/useCameraStream";
import { useWhiteBalanceLock } from "@/features/camera/useWhiteBalanceLock";
import { useMyShadeStore } from "@/features/myShade/store";
import { ensureVideoMode, useFaceLandmarker } from "@/features/landmark/useFaceLandmarker";
import { useAnalysisStore } from "@/stores/analysisStore";
import { AdvancedPanel } from "./AdvancedPanel";
import { LightingBadges } from "./LightingBadges";
import { ResultPanel } from "./ResultPanel";
import { SetupPanel } from "./SetupPanel";
import { StageOverlay } from "./StageOverlay";
import { useIsMobile } from "./useIsMobile";
import { useStillAnalysis } from "./useStillAnalysis";
import { useTryOnLoop } from "./useTryOnLoop";
import { WhiteBalanceLockCard } from "./WhiteBalanceLockCard";

export function TrySession() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { status: modelStatus, error: modelError, progress: modelProgress, landmarkerRef, retry } = useFaceLandmarker();
  const isMobile = useIsMobile();
  const camera = useCameraStream(videoRef);
  const still = useStillAnalysis({ canvasRef, landmarkerRef });

  const stage = useAnalysisStore((s) => s.stage);
  const source = useAnalysisStore((s) => s.source);
  const lighting = useAnalysisStore((s) => s.lighting);
  const faceFound = useAnalysisStore((s) => s.faceFound);
  const progress = useAnalysisStore((s) => s.progress);
  const result = useAnalysisStore((s) => s.result);
  const begin = useAnalysisStore((s) => s.begin);
  const startMeasuring = useAnalysisStore((s) => s.startMeasuring);
  const reset = useAnalysisStore((s) => s.reset);
  const measureMore = useAnalysisStore((s) => s.measureMore);
  const setComparing = useAnalysisStore((s) => s.setComparing);
  const comparing = useAnalysisStore((s) => s.comparing);
  const resultTab = useAnalysisStore((s) => s.resultTab);
  /** 사진을 보며 색을 고르는 발라 보기에서만 사진 무대를 화면 위에 고정한다 */
  const pinStage = stage === "done" && resultTab === "tryon";
  /** 흰색 기준을 찍는 중 */
  const [pickingWhite, setPickingWhite] = useState(false);
  const [whiteMessage, setWhiteMessage] = useState<string | null>(null);

  const cameraLive = camera.status === "active" && source === "camera";
  useTryOnLoop({ videoRef, canvasRef, landmarkerRef, active: cameraLive });
  const whiteBalance = useWhiteBalanceLock(videoRef, camera.videoTrack, cameraLive);
  const hydrateShades = useMyShadeStore((s) => s.hydrate);
  useEffect(() => hydrateShades(), [hydrateShades]);

  const startCamera = async () => {
    still.clear();
    const lm = landmarkerRef.current;
    if (lm) await ensureVideoMode(lm);
    begin("camera");
    track({ name: "try-start", source: "camera" });
    await camera.start();
  };

  const uploadFiles = (files: File[]) => {
    camera.stop();
    track({ name: "try-start", source: "image" });
    void still.analyze(files);
  };

  const addPhotos = (files: File[]) => void still.analyze(files, true);

  /** 캔버스를 누른 자리: 흰색 찍는 중이면 기준으로 쓰고, 아니면 꾹 누르는 동안 바르기 전 모습을 보여 준다 */
  const onCanvasDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (stage !== "done") return;
    if (pickingWhite && still.shown) {
      const rect = e.currentTarget.getBoundingClientRect();
      const message = still.setWhitePoint(still.shown.id, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
      setWhiteMessage(message);
      if (!message) setPickingWhite(false);
      return;
    }
    setComparing(true);
  };
  const stopCompare = () => {
    if (comparing) setComparing(false);
  };

  const restart = () => {
    setPickingWhite(false);
    setWhiteMessage(null);
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
    <div>
      {(stage === "setup" || cameraFailed) && (
        <SetupPanel
          modelStatus={modelStatus}
          modelError={modelError}
          modelProgress={modelProgress}
          cameraStatus={camera.status}
          isMobile={isMobile}
          onRetry={retry}
          onCamera={startCamera}
          onUpload={uploadFiles}
        />
      )}

      {/* 모바일: 사진 무대를 가장자리까지 넓혀 위에 고정하고 아래 패널을 스크롤. 데스크톱: 왼쪽 무대 고정, 오른쪽 패널 */}
      <div className={showStage ? "md:grid md:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] md:items-start md:gap-12" : "hidden"}>
        <div className={`${pinStage ? "sticky top-0" : "relative"} z-10 -mx-4 bg-card md:sticky md:top-6 md:mx-0 md:rounded-[12px]`}>
          <div className="relative mx-auto w-fit max-w-full">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`absolute inset-0 h-full w-full object-cover ${source === "camera" ? "-scale-x-100" : ""}`}
            />
            <canvas
              ref={canvasRef}
              aria-label="카메라 미리보기와 립 컬러 체험. 꾹 누르면 바르기 전 모습"
              onPointerDown={onCanvasDown}
              onPointerUp={stopCompare}
              onPointerLeave={stopCompare}
              onPointerCancel={stopCompare}
              onContextMenu={(e) => e.preventDefault()}
              className={`relative block touch-manipulation select-none ${pickingWhite ? "cursor-crosshair" : ""} h-auto ${pinStage ? "max-h-[min(50svh,480px)]" : "max-h-[min(44svh,420px)]"} w-auto max-w-full md:max-h-[calc(100svh-7rem)] md:rounded-[12px] ${source === "camera" ? "-scale-x-100" : ""}`}
            />
            <StageOverlay pickingWhite={pickingWhite} />
            <button
              type="button"
              onClick={restart}
              className="absolute right-3 top-3 h-8 rounded-[6px] bg-white/95 px-3 text-[13px] font-medium text-fg backdrop-blur focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              처음부터
            </button>
          </div>
        </div>

        <div className="space-y-6 pt-6 md:pt-2">
          {still.error && (
            <p role="alert" className="border-l-2 border-amber-500 pl-3 text-sm text-amber-900">
              {still.error}
            </p>
          )}

          {stage !== "done" && !still.error && <LightingBadges issues={lighting} faceFound={faceFound} />}

          {stage === "live" && source === "camera" && (
            <>
              <button type="button" onClick={startMeasuring} disabled={!faceFound} className={`${BUTTON.primary} w-full`}>
                측정 시작
              </button>
              <p className="text-[13px] text-muted">이가 보이게 살짝 웃거나 눈을 크게 뜨면 치아·눈 흰자를 기준으로 조명을 더 정확히 되돌려요.</p>
              {whiteBalance.supported && (
                <WhiteBalanceLockCard
                  locked={whiteBalance.locked}
                  busy={whiteBalance.busy}
                  error={whiteBalance.error}
                  onLock={() => void whiteBalance.lock()}
                  onUnlock={() => void whiteBalance.unlock()}
                />
              )}
            </>
          )}

          {stage === "measuring" && (
            <div role="status" aria-live="polite" className="space-y-2">
              <p className="text-sm">가만히 있어 주세요… {Math.round(progress * 100)}%</p>
              <div className="h-1 overflow-hidden rounded-full bg-line">
                <div className="h-full bg-accent transition-[width]" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          )}

          {stage === "done" && (
            <>
              <ResultPanel
                onAddPhotos={addPhotos}
                onMeasureMore={measureMore}
                photos={still.photos}
                whiteFix={
                  source === "image" && still.shown ? (
                    <WhiteFixCard
                      fixed={Boolean(still.shown.white)}
                      picking={pickingWhite}
                      message={whiteMessage}
                      multiple={still.photos.length > 1}
                      onToggle={() => {
                        setWhiteMessage(null);
                        setPickingWhite((v) => !v);
                      }}
                    />
                  ) : undefined
                }
              />
              {lighting.length > 0 && result && !isFullyCorrected(result.reference ?? "none") && (
                <p className="text-xs text-muted">
                  조명 참고: {lighting.map((i) => LIGHTING_LABELS[i]).join(", ")} 조건이었어요. {REFERENCE_LABEL[result.reference ?? "none"]}이라 결과가 평소와 다를 수 있어요.
                </p>
              )}
            </>
          )}

          <div className="space-y-4 border-t border-line pt-5">
            <Disclaimer />
            <AdvancedPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

interface WhiteFixCardProps {
  fixed: boolean;
  picking: boolean;
  message: string | null;
  multiple: boolean;
  onToggle: () => void;
}

/** 사진 속 흰색을 눌러 조명을 완전히 되돌리는 보정. 같은 사람이 사진마다 다르게 나오는 걸 가장 크게 줄인다 */
function WhiteFixCard({ fixed, picking, message, multiple, onToggle }: WhiteFixCardProps) {
  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted">
        {fixed
          ? "사진 속 흰색을 기준으로 조명의 색과 밝기를 되돌렸어요. 다른 곳을 눌러 다시 맞출 수도 있어요."
          : "사진에 흰 종이·흰 벽·흰 옷이 있으면 눌러 주세요. 조명 때문에 생긴 노란 기·푸른 기·밝기 차이를 없애서 사진마다 결과가 덜 달라져요. 햇빛 아래 복사지는 푸르게 찍혀서 흰 벽이 더 나을 수 있어요."}
        {multiple && " 사진마다 따로 맞춰요. 위에서 사진을 고른 뒤 눌러 주세요."}
      </p>
      {message && (
        <p role="alert" className="text-amber-900">
          {message}
        </p>
      )}
      <button type="button" onClick={onToggle} aria-pressed={picking} className={picking ? `${BUTTON.small} border-fg bg-fg text-white` : BUTTON.small}>
        {picking ? "취소" : fixed ? "다시 맞추기" : "사진에서 흰색 누르기"}
      </button>
    </div>
  );
}
