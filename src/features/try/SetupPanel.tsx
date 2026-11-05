"use client";

import type { CameraStatus } from "@/features/camera/useCameraStream";
import type { LoadProgress } from "@/features/landmark/useFaceLandmarker";
import { BUTTON } from "@/components/styles";
import { ModelLoading } from "./ModelLoading";
import { UploadButton } from "./UploadButton";

const CAMERA_MESSAGES = {
  denied: "카메라 권한이 거부됐어요. 브라우저 설정에서 허용하거나, 사진을 올려서 해볼 수 있어요.",
  unavailable: "카메라를 열 수 없어요. 다른 앱이 쓰고 있지 않은지 확인하거나, 사진을 올려서 해볼 수 있어요.",
  unsupported: "이 브라우저는 카메라를 지원하지 않아요. 사진을 올려서 해볼 수 있어요.",
} as const;

/** 잘 나오는 사진의 조건. 순서가 아니라 체크 항목이라 번호를 붙이지 않는다 */
const PHOTO_TIPS = [
  { title: "자연광 아래 정면", body: "창가에서, 앞머리는 넘기고" },
  { title: "이가 보이게 웃기", body: "치아를 기준으로 조명을 맞춰요" },
  { title: "흰 종이를 얼굴 옆에", body: "같이 찍으면 조명을 더 정확히 맞춰요" },
  { title: "여러 장이면 더 정확", body: "다른 곳에서 찍은 사진을 더하면 더 정확해요. 최대 5장" },
];

interface SetupPanelProps {
  modelStatus: "loading" | "ready" | "error";
  modelError: string | null;
  modelProgress: LoadProgress | null;
  cameraStatus: CameraStatus;
  isMobile: boolean;
  onRetry: () => void;
  onCamera: () => void;
  onUpload: (files: File[]) => void;
}

/** 시작 화면: 모듈 준비 상태, 사진·카메라 선택, 잘 나오는 사진 조건 */
export function SetupPanel({ modelStatus, modelError, modelProgress, cameraStatus, isMobile, onRetry, onCamera, onUpload }: SetupPanelProps) {
  const ready = modelStatus === "ready";
  const cameraFailed = cameraStatus === "denied" || cameraStatus === "unavailable" || cameraStatus === "unsupported";
  const cameraLabel = cameraStatus === "requesting" ? "카메라 여는 중…" : isMobile ? "실시간 카메라로" : "카메라로 시작";
  const cameraButton = cameraStatus !== "unsupported" && (
    <button
      type="button"
      onClick={onCamera}
      disabled={!ready || cameraStatus === "requesting"}
      className={isMobile || cameraFailed ? BUTTON.secondary : BUTTON.primary}
    >
      {cameraLabel}
    </button>
  );
  const uploadButton = (
    <UploadButton disabled={!ready} onFiles={onUpload} multiple variant={isMobile || cameraFailed ? "primary" : "secondary"} label={isMobile ? "사진으로 시작하기" : "사진 올리기"} />
  );

  return (
    <section className="mx-auto max-w-xl pt-4 md:pt-10">
      <h2 className="text-[28px] font-bold leading-tight md:text-[40px]">내 얼굴로 하는 컬러 테스트</h2>
      <p className="mt-3 text-[15px] text-muted">셀카 한 장이면 돼요.</p>

      <div className="mt-8">
        {modelStatus === "loading" ? (
          <ModelLoading progress={modelProgress} />
        ) : (
          <p role="status" aria-live="polite" className="text-sm text-muted">
            {modelStatus === "error" && "얼굴 인식 모듈을 불러오지 못했어요. 네트워크를 확인하고 다시 시도해 주세요."}
            {ready && "준비됐어요. 자연광 아래, 정면을 비춰 주세요."}
          </p>
        )}
        {cameraFailed && (
          <p role="alert" className="mt-4 border-l-2 border-amber-500 pl-3 text-sm text-amber-900">
            {CAMERA_MESSAGES[cameraStatus as keyof typeof CAMERA_MESSAGES]}
          </p>
        )}
        {modelStatus === "error" && (
          <div className="mt-4 space-y-2">
            <button type="button" onClick={onRetry} className={BUTTON.secondary}>
              다시 시도
            </button>
            {modelError && <p className="break-all font-mono text-xs text-muted">{modelError}</p>}
          </div>
        )}
      </div>

      {/* 모바일은 파일 선택창이 곧 카메라·앨범 선택이라 그걸 앞에 둔다 */}
      <div className="mt-6 flex flex-wrap gap-2.5">
        {isMobile || cameraFailed ? (
          <>
            {uploadButton}
            {cameraButton}
          </>
        ) : (
          <>
            {cameraButton}
            {uploadButton}
          </>
        )}
      </div>

      <h3 className="mt-12 text-[15px] font-semibold">잘 나오는 사진</h3>
      <dl className="mt-3 divide-y divide-line border-y border-line">
        {PHOTO_TIPS.map((tip) => (
          <div key={tip.title} className="grid gap-1 py-3.5 sm:grid-cols-[9rem_1fr] sm:gap-4">
            <dt className="text-sm font-medium">{tip.title}</dt>
            <dd className="text-sm text-muted">{tip.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
