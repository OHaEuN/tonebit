"use client";

import { useAnalysisStore } from "@/stores/analysisStore";

interface StageOverlayProps {
  /** 흰색 기준을 누르는 중이면 안내만 띄운다 */
  pickingWhite: boolean;
}

const PILL = "pointer-events-none rounded-[6px] bg-black/70 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white backdrop-blur-sm";

/** 사진 위에는 조작만 둔다: 꾹 눌러 전후 비교 버튼과 지금 상태 라벨. 색 이름·제품은 아래 고정 바에 */
export function StageOverlay({ pickingWhite }: StageOverlayProps) {
  const lipId = useAnalysisStore((s) => s.lipId);
  const blushId = useAnalysisStore((s) => s.blushId);
  const comparing = useAnalysisStore((s) => s.comparing);
  const setComparing = useAnalysisStore((s) => s.setComparing);
  const stage = useAnalysisStore((s) => s.stage);

  if (pickingWhite) {
    return <span className={`${PILL} absolute left-1/2 top-3 -translate-x-1/2`}>흰 종이·흰 벽을 눌러 주세요</span>;
  }
  if (stage !== "done") return null;

  const applied = Boolean(lipId || blushId);

  return (
    <>
      {comparing && <span className={`${PILL} absolute left-1/2 top-3 -translate-x-1/2`}>원래 얼굴</span>}
      {applied && (
        <button
          type="button"
          aria-label="누르고 있는 동안 바르기 전 모습 보기"
          onPointerDown={() => setComparing(true)}
          onPointerUp={() => setComparing(false)}
          onPointerLeave={() => comparing && setComparing(false)}
          onPointerCancel={() => setComparing(false)}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute bottom-3 right-3 flex h-12 touch-none select-none flex-col items-center justify-center rounded-[6px] bg-white/95 px-3 text-[11px] font-semibold text-fg backdrop-blur focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M10 3v14" strokeLinecap="round" />
            <path d="M10 5a5 5 0 0 0 0 10" strokeLinecap="round" />
          </svg>
          전후
        </button>
      )}
    </>
  );
}
