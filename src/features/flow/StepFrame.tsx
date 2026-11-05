import type { ReactNode } from "react";
import { BUTTON } from "@/components/styles";

/** 본 흐름의 단계 수(내 톤 → 느낌 → 질감 → 고르기 → 내 립) */
export const MAIN_STEPS = 5;

interface StepFrameProps {
  /** 본 흐름에서 몇 번째인지(1부터). 곁가지 화면은 없음 */
  index?: number;
  title: ReactNode;
  body?: ReactNode;
  /** 제목 위 뒤로 가기. 브라우저 뒤로와 같다 */
  onBack?: () => void;
  children?: ReactNode;
  /** 화면마다 하나뿐인 주 행동. 폰에선 아래에 붙는다 */
  cta?: { label: string; onClick: () => void; disabled?: boolean };
  /** 주 행동 아래 작은 보조 링크들 */
  aside?: ReactNode;
  headingId?: string;
}

/**
 * 측정 뒤 화면의 틀. 한 화면에 질문(제목) 하나와 주 행동 하나만 둔다.
 * 위에 진행 막대와 뒤로, 아래에 주 행동. 가운데는 그 화면의 한 가지 일
 */
export function StepFrame({ index, title, body, onBack, children, cta, aside, headingId = "step-heading" }: StepFrameProps) {
  return (
    <section aria-labelledby={headingId} className="flex min-h-[60svh] flex-col">
      <div className="flex h-8 items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="이전 화면"
            className="-ml-2 flex size-8 items-center justify-center rounded-[6px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.5 4 6.5 10l6 6" />
            </svg>
          </button>
        )}
        {index && (
          <ol aria-label={`${MAIN_STEPS}단계 중 ${index}단계`} className="flex flex-1 gap-1">
            {Array.from({ length: MAIN_STEPS }, (_, i) => (
              <li key={i} className={`h-1 flex-1 rounded-full ${i < index ? "bg-fg" : "bg-line"}`} />
            ))}
          </ol>
        )}
      </div>
      <h2 id={headingId} className="mt-4 break-keep text-[26px] font-semibold leading-[1.2] md:text-[32px]">
        {title}
      </h2>
      {body && <p className="mt-2 break-keep text-[15px] leading-relaxed text-muted">{body}</p>}
      <div className="mt-6 flex-1">{children}</div>
      {(cta || aside) && (
        <div className="sticky bottom-0 z-10 -mx-4 mt-8 bg-bg/95 px-4 pb-4 pt-3 backdrop-blur md:static md:mx-0 md:px-0 md:pb-0">
          {cta && (
            <button type="button" onClick={cta.onClick} disabled={cta.disabled} className={`${BUTTON.primary} w-full`}>
              {cta.label}
            </button>
          )}
          {aside && <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px]">{aside}</div>}
        </div>
      )}
    </section>
  );
}
