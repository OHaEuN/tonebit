"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { Disclaimer } from "@/components/Disclaimer";
import { BUTTON } from "@/components/styles";
import { LIGHTING_LABELS } from "@/features/analysis/lighting";
import { REFERENCE_LABEL } from "@/features/analysis/reference";
import { isFullyCorrected } from "@/features/analysis/tone";
import { track } from "@/features/analytics/track";
import { useCameraStream } from "@/features/camera/useCameraStream";
import { useWhiteBalanceLock } from "@/features/camera/useWhiteBalanceLock";
import { useMyShadeStore } from "@/features/myShade/store";
import { faceBounds } from "@/features/landmark/geometry";
import { ensureVideoMode, useFaceLandmarker } from "@/features/landmark/useFaceLandmarker";
import { useAnalysisStore } from "@/stores/analysisStore";
import type { LightingIssue } from "@/types/analysis";
import { AdvancedPanel } from "./AdvancedPanel";
import { LightingBadges } from "./LightingBadges";
import { PhotoViewer } from "./PhotoViewer";
import { QuickTryOn } from "./QuickTryOn";
import { ResultPanel } from "./ResultPanel";
import { SetupPanel } from "./SetupPanel";
import { StageOverlay } from "./StageOverlay";
import { useIsMobile } from "./useIsMobile";
import { useStillAnalysis } from "./useStillAnalysis";
import { useTryOnLoop } from "./useTryOnLoop";
import { WhiteBalanceLockCard } from "./WhiteBalanceLockCard";

/** 이보다 오래 누르면 "바르기 전" 비교, 짧게 떼면 크게 보기 */
const HOLD_MS = 220;

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
  const [viewerOpen, setViewerOpen] = useState(false);
  const closeViewer = useCallback(() => setViewerOpen(false), []);
  const holdTimer = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  /** 발라 보기에서 고정된 사진은 아래 색을 고르려 내리면 작게 접는다(모바일) */
  const compact = useCompactOnScroll(stageRef, pinStage && isMobile);

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

  /**
   * 캔버스를 누른 자리: 흰색 찍는 중이면 기준으로 쓴다. 아니면 꾹 누르는 동안 바르기 전 모습, 짧게 탭하면 크게 보기.
   * 결과가 나오기 전(카메라 미리보기)엔 아무것도 하지 않는다
   */
  const onCanvasDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (stage !== "done") return;
    if (pickingWhite && still.shown) {
      const rect = e.currentTarget.getBoundingClientRect();
      const message = still.setWhitePoint(still.shown.id, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
      setWhiteMessage(message);
      if (!message) setPickingWhite(false);
      return;
    }
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      setComparing(true);
    }, HOLD_MS);
  };
  const onCanvasUp = () => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
      setViewerOpen(true);
      return;
    }
    if (comparing) setComparing(false);
  };
  const cancelHold = () => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    if (comparing) setComparing(false);
  };

  const restart = () => {
    setViewerOpen(false);
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
        <div ref={stageRef} className={`${pinStage ? "sticky top-0" : "relative"} z-10 -mx-4 bg-card md:sticky md:top-6 md:mx-0 md:rounded-[12px]`}>
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
              onPointerUp={onCanvasUp}
              onPointerLeave={cancelHold}
              onPointerCancel={cancelHold}
              onContextMenu={(e) => e.preventDefault()}
              className={`relative block touch-manipulation select-none ${pickingWhite ? "cursor-crosshair" : ""} h-auto ${compact ? "max-h-[min(26svh,240px)]" : pinStage ? "max-h-[min(50svh,480px)]" : "max-h-[min(44svh,420px)]"} w-auto max-w-full md:max-h-[calc(100svh-7rem)] md:rounded-[12px] ${source === "camera" ? "-scale-x-100" : ""}`}
            />
            <StageOverlay pickingWhite={pickingWhite} />
            {stage === "done" && !pickingWhite && (
              <button
                type="button"
                onClick={() => setViewerOpen(true)}
                aria-label="사진 크게 보기"
                className="absolute bottom-3 left-3 flex size-12 items-center justify-center rounded-[6px] bg-white/95 text-fg backdrop-blur focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3h5v5M8 17H3v-5M17 3l-6 6M3 17l6-6" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={restart}
              className="absolute right-3 top-3 h-8 rounded-[6px] bg-white/95 px-3 text-[13px] font-medium text-fg backdrop-blur focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              처음부터
            </button>
          </div>
        </div>

        {viewerOpen && (
          <PhotoViewer
            sourceRef={canvasRef}
            render={source === "image" ? still.paint : null}
            focus={source === "image" && still.shown ? faceBounds(still.shown.landmarks) : null}
            mirrored={source === "camera"}
            onClose={closeViewer}
          >
            <QuickTryOn />
          </PhotoViewer>
        )}

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
                onPreview={() => setViewerOpen(true)}
                whiteFixUrgent={
                  source === "image" &&
                  !still.shown?.white &&
                  Boolean(still.shown?.lighting.some((i) => i === "warmCast" || i === "coolCast" || i === "greenCast")) &&
                  !isFullyCorrected(result?.reference ?? "none")
                }
                whiteFix={
                  source === "image" && still.shown ? (
                    <WhiteFixCard
                      fixed={Boolean(still.shown.white)}
                      picking={pickingWhite}
                      message={whiteMessage}
                      multiple={still.photos.length > 1}
                      // 자동으로 찾은 "흰색"은 회색 벽일 수도 있어 노출(밝기)까지 맞추면 ITA가 밝은 쪽으로 튄다.
                      // 치아·흰자·흰 종이 고정처럼 믿을 기준이 이미 있으면 제안하지 않는다
                      hasHint={Boolean(still.shown.whiteHint) && !isFullyCorrected(result?.reference ?? "none")}
                      cast={still.shown.lighting.find((i) => i === "warmCast" || i === "coolCast" || i === "greenCast") ?? null}
                      onUseHint={() => {
                        const hint = still.shown?.whiteHint;
                        if (!hint || !still.shown) return;
                        setPickingWhite(false);
                        setWhiteMessage(still.setWhitePoint(still.shown.id, hint.u, hint.v));
                      }}
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

function useCompactOnScroll(ref: RefObject<HTMLDivElement | null>, enabled: boolean): boolean {
  const [on, setOn] = useState(false);
  const fullHeight = useRef(0);
  const active = enabled && on;

  useEffect(() => {
    if (!enabled) return;
    let current = false;
    const update = () => {
      const next = current ? window.scrollY > 60 : window.scrollY > 160;
      if (next === current) return;
      // 접기 직전 펼친 높이를 잰다
      if (next && ref.current) fullHeight.current = ref.current.offsetHeight;
      current = next;
      setOn(next);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      setOn(false);
    };
  }, [ref, enabled]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.style.marginBottom = active ? `${Math.max(0, fullHeight.current - el.offsetHeight)}px` : "";
  }, [ref, active]);

  return active;
}

interface WhiteFixCardProps {
  fixed: boolean;
  picking: boolean;
  message: string | null;
  multiple: boolean;
  /** 사진에서 흰색 후보를 자동으로 찾았다 */
  hasHint: boolean;
  /** 이 사진에서 잡힌 조명 색 */
  cast: LightingIssue | null;
  onUseHint: () => void;
  onToggle: () => void;
}

const CAST_NOTES: Partial<Record<LightingIssue, string>> = {
  greenCast: "형광등 같은 초록빛 조명이 섞였어요. 이럴 땐 흰색 기준을 맞춰야 정확해요.",
  warmCast: "주황빛 조명이 섞였어요. 이럴 땐 흰색 기준을 맞춰야 정확해요.",
  coolCast: "푸른빛 조명이 섞였어요. 이럴 땐 흰색 기준을 맞춰야 정확해요.",
};

/**
 * 사진 속 흰색을 기준으로 조명을 완전히 되돌리는 보정. 같은 사람이 사진마다 다르게 나오는 걸 가장 크게 줄인다.
 * 흰 종이·흰 벽으로 보이는 곳을 미리 찾아 두면 한 번에 맞출 수 있다
 */
function WhiteFixCard({ fixed, picking, message, multiple, hasHint, cast, onUseHint, onToggle }: WhiteFixCardProps) {
  return (
    <div className="space-y-2 text-sm">
      {!fixed && cast && <p className="font-medium">{CAST_NOTES[cast]}</p>}
      <p className="text-muted">
        {fixed
          ? "표시한 곳의 흰색을 기준으로 조명의 색과 밝기를 되돌렸어요. 흰색이 아닌 곳이면 다시 맞춰 주세요."
          : hasHint
            ? "사진에서 흰 종이·흰 벽으로 보이는 곳을 찾았어요. 그걸로 맞추거나 직접 눌러 주세요. 조명 때문에 생긴 노란 기·푸른 기·초록 기와 밝기 차이를 없애요."
            : "사진에 흰 종이·흰 벽·흰 옷이 있으면 눌러 주세요. 조명 때문에 생긴 노란 기·푸른 기·밝기 차이를 없애서 사진마다 결과가 덜 달라져요. 햇빛 아래 복사지는 푸르게 찍혀서 흰 벽이 더 나을 수 있어요."}
        {multiple && " 사진마다 따로 맞춰요. 위에서 사진을 고른 뒤 맞춰 주세요."}
      </p>
      {message && (
        <p role="alert" className="text-amber-900">
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {!fixed && hasHint && !picking && (
          <button type="button" onClick={onUseHint} className={`${BUTTON.small} border-fg bg-fg text-white`}>
            찾은 흰색으로 맞추기
          </button>
        )}
        <button type="button" onClick={onToggle} aria-pressed={picking} className={picking ? `${BUTTON.small} border-fg bg-fg text-white` : BUTTON.small}>
          {picking ? "취소" : fixed ? "다시 맞추기" : hasHint ? "직접 누르기" : "사진에서 흰색 누르기"}
        </button>
      </div>
    </div>
  );
}
