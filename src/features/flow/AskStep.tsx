"use client";

import { AdvisorPanel } from "@/features/advisor/AdvisorPanel";
import { useAnalysisStore } from "@/stores/analysisStore";
import { StepFrame } from "./StepFrame";

interface AskStepProps {
  /** 발라 본 모습을 크게 보여 준다 */
  onPreview: () => void;
}

/** 곁가지: AI 상담. 진단 숫자와 질문만 서버로 간다 */
export function AskStep({ onPreview }: AskStepProps) {
  const tone = useAnalysisStore((s) => s.result!.tone);
  return (
    <StepFrame title="더 물어보기" body="출근용 립, 피할 색, 가격대 같은 걸 물어보면 제품 DB와 가이드를 찾아 답해요." onBack={() => window.history.back()}>
      {process.env.NEXT_PUBLIC_ADVISOR_ENABLED ? <AdvisorPanel key={tone} onPreview={onPreview} /> : <p className="text-[14px] text-muted">지금은 상담을 쓸 수 없어요.</p>}
    </StepFrame>
  );
}
