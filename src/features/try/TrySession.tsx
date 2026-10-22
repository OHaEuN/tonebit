"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { PrivacyNote } from "@/components/PrivacyNote";
import { Disclaimer } from "@/components/Disclaimer";
import { LIGHTING_LABELS } from "@/features/analysis/lighting";
import { track } from "@/features/analytics/track";
import { useCameraStream } from "@/features/camera/useCameraStream";
import { ensureVideoMode, useFaceLandmarker } from "@/features/landmark/useFaceLandmarker";
import { useAnalysisStore } from "@/stores/analysisStore";
import type { LightingIssue } from "@/types/analysis";
import { AdvancedPanel } from "./AdvancedPanel";
import { LightingBadges } from "./LightingBadges";
import { ModelLoading } from "./ModelLoading";
import { PhotoViewer } from "./PhotoViewer";
import { QuickTryOn } from "./QuickTryOn";
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

/** 이보다 오래 누르면 "바르기 전" 비교, 짧게 떼면 크게 보기 */
const HOLD_MS = 220;

const BUTTON = "rounded-full px-5 py-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

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
  const begin = useAnalysisStore((s) => s.begin);
  const startMeasuring = useAnalysisStore((s) => s.startMeasuring);
  const reset = useAnalysisStore((s) => s.reset);
  const measureMore = useAnalysisStore((s) => s.measureMore);
  const setComparing = useAnalysisStore((s) => s.setComparing);
  const comparing = useAnalysisStore((s) => s.comparing);
  /** 흰색 기준을 찍는 중 */
  const [pickingWhite, setPickingWhite] = useState(false);
  const [whiteMessage, setWhiteMessage] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const closeViewer = useCallback(() => setViewerOpen(false), []);
  const holdTimer = useRef<number | null>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const compact = useCompactOnScroll(stickyRef, stage === "done");

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
    <div className="space-y-5">
      {(stage === "setup" || cameraFailed) && (
        <section className="space-y-4">
          <PrivacyNote />
          {modelStatus === "loading" ? (
            <ModelLoading progress={modelProgress} />
          ) : (
            <p role="status" aria-live="polite" className="text-sm text-muted">
              {modelStatus === "error" && "얼굴 인식 모듈을 불러오지 못했어요. 네트워크를 확인하고 다시 시도해 주세요."}
              {modelReady && "준비됐어요. 자연광 아래, 정면을 비춰 주세요."}
            </p>
          )}
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
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
            <li>사진은 한 번에 최대 5장까지 고를 수 있어요. 여러 장을 합치면 조명 운에 덜 흔들려요.</li>
            <li>흰 종이(A4)를 얼굴 옆에 들고 찍으면, 결과 화면에서 종이를 눌러 색을 가장 정확하게 맞출 수 있어요.</li>
          </ul>
          {/* 모바일은 파일 선택창이 곧 카메라·앨범 선택이라 그걸 기본으로. 실시간 카메라는 보조 */}
          <div className="flex flex-wrap gap-2">
            {isMobile ? (
              <>
                <UploadButton disabled={!modelReady} onFiles={uploadFiles} multiple variant="primary" label="사진으로 시작하기" />
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
                <UploadButton disabled={!modelReady} onFiles={uploadFiles} multiple variant={cameraFailed ? "primary" : "secondary"} />
              </>
            )}
          </div>
        </section>
      )}

      <div className={showStage ? "space-y-5" : "hidden"}>
        {/* 아래 색을 고르는 동안 얼굴이 계속 보이게 상단에 고정한다. 화면을 덮지 않게 높이는 화면 비율과 절대 크기 중 작은 쪽으로 묶고,
            결과를 읽으려고 내리면 작게 접는다. 접힌 만큼 아래 여백으로 채워 글이 튀지 않게 한다 */}
        <div ref={stickyRef} className="sticky top-0 z-10 -mx-4 bg-bg px-4 py-2">
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
              aria-label="카메라 미리보기와 립 컬러 체험. 꾹 누르면 바르기 전 모습"
              onPointerDown={onCanvasDown}
              onPointerUp={onCanvasUp}
              onPointerLeave={cancelHold}
              onPointerCancel={cancelHold}
              onContextMenu={(e) => e.preventDefault()}
              className={`relative block touch-manipulation select-none ${pickingWhite ? "cursor-crosshair" : ""} h-auto w-auto max-w-full ${compact ? "max-h-[min(18svh,140px)] md:max-h-[min(26svh,220px)]" : "max-h-[min(34svh,300px)] md:max-h-[min(50svh,440px)]"} ${source === "camera" ? "-scale-x-100" : ""}`}
            />
            {(comparing || pickingWhite) && (
              <span className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium whitespace-nowrap text-white">
                {pickingWhite ? "흰 종이·흰 벽을 눌러 주세요" : "바르기 전"}
              </span>
            )}
            {stage === "done" && !pickingWhite && (
              <button
                type="button"
                onClick={() => setViewerOpen(true)}
                aria-label="사진 크게 보기"
                className="absolute right-2 bottom-2 flex size-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3h5v5M8 17H3v-5M17 3l-6 6M3 17l6-6" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {viewerOpen && (
          <PhotoViewer sourceRef={canvasRef} render={source === "image" ? still.paint : null} mirrored={source === "camera"} onClose={closeViewer}>
            <QuickTryOn />
          </PhotoViewer>
        )}

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
                    hasHint={Boolean(still.shown.whiteHint)}
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
            {lighting.length > 0 && !still.shown?.white && (
              <p className="text-xs text-muted">
                조명 참고: {lighting.map((i) => LIGHTING_LABELS[i]).join(", ")} 조건이었어요. 배경 색으로 조명을 일부 보정했지만 결과가 평소와 다를 수 있어요.
              </p>
            )}
          </>
        )}

        <AdvancedPanel />
        <div className="flex flex-wrap gap-2">
          <UploadButton disabled={!modelReady} onFiles={uploadFiles} multiple />
          <button type="button" onClick={restart} className={`${BUTTON} border border-line bg-card hover:bg-accent-soft`}>
            처음으로
          </button>
        </div>
        <Disclaimer />
      </div>
    </div>
  );
}

/**
 * 결과 화면에서 아래로 내리면 고정된 사진을 작게 접는다. 접혀 줄어든 높이만큼 spacer(아래 여백)로 채워
 * 문서 높이가 그대로라 스크롤 위치·글 위치가 튀지 않는다. 경계에서 깜빡이지 않게 접는 지점과 펴는 지점을 다르게 둔다
 */
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
  greenCast: "형광등 같은 초록빛 조명이 섞였어요.",
  warmCast: "주황빛 조명이 섞였어요.",
  coolCast: "푸른빛 조명이 섞였어요.",
};

/**
 * 사진 속 흰색을 기준으로 조명을 완전히 되돌리는 보정. 같은 사람이 사진마다·조명마다 다르게 나오는 걸 가장 크게 줄인다.
 * 형광등처럼 배경 색만으론 다 못 되돌리는 조명이면 앞에 내세운다
 */
function WhiteFixCard({ fixed, picking, message, multiple, hasHint, cast, onUseHint, onToggle }: WhiteFixCardProps) {
  const urgent = !fixed && cast !== null;
  const secondary = "border border-line bg-card hover:bg-accent-soft";
  return (
    <div className={`space-y-2 rounded-2xl border p-4 text-sm ${urgent ? "border-amber-300 bg-amber-50" : "border-line"}`}>
      <p className="font-medium">
        {fixed ? "흰색 기준으로 색을 맞췄어요" : urgent ? "이 조명에선 흰색 기준을 맞춰야 정확해요" : "더 정확하게: 흰색 기준 맞추기"}
      </p>
      <p className="text-muted">
        {fixed
          ? "표시한 곳의 흰색을 기준으로 조명의 색과 밝기를 되돌렸어요. 흰색이 아닌 곳이면 다시 맞춰 주세요."
          : `${cast ? `${CAST_NOTES[cast]} ` : ""}${
              hasHint
                ? "사진에서 흰 종이·흰 벽으로 보이는 곳을 찾았어요. 그걸로 맞추거나 직접 눌러 주세요."
                : "사진에 흰 종이·흰 벽·흰 옷이 있으면 눌러 주세요. 없으면 흰 종이를 얼굴 옆에 들고 다시 찍어 주세요."
            } 조명 때문에 생긴 노란 기·푸른 기·초록 기와 밝기 차이를 없애요.`}
        {multiple && " 사진마다 따로 맞춰요. 위에서 사진을 고른 뒤 맞춰 주세요."}
      </p>
      {message && (
        <p role="alert" className="text-amber-900">
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {!fixed && hasHint && !picking && (
          <button
            type="button"
            onClick={onUseHint}
            className="rounded-full bg-fg px-4 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            찾은 흰색으로 맞추기
          </button>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={picking}
          className={`rounded-full px-4 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            picking ? "bg-fg text-white" : secondary
          }`}
        >
          {picking ? "취소" : fixed ? "다시 맞추기" : hasHint ? "직접 누르기" : "사진에서 흰색 누르기"}
        </button>
      </div>
    </div>
  );
}
