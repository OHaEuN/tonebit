"use client";

import { AdvisorPanel } from "@/features/advisor/AdvisorPanel";
import { useAnalysisStore } from "@/stores/analysisStore";
import { StepFrame } from "./StepFrame";
import { useToneLabel } from "./useToneLabel";

interface AskStepProps {
  /** 발라 본 모습을 크게 보여 준다 */
  onPreview: () => void;
}

/** 곁가지: AI 상담. 진단 숫자와 질문만 서버로 간다 */
export function AskStep({ onPreview }: AskStepProps) {
  const slug = useAnalysisStore((s) => s.result!.tone);
  const tone = useToneLabel();
  return (
    <StepFrame context={tone} title="AI에게 물어보기" body="내 톤에 맞는 립이나 피할 색을 물어보세요. 사진은 보내지 않아요." onBack={() => window.history.back()}>
      {process.env.NEXT_PUBLIC_ADVISOR_ENABLED ? <AdvisorPanel key={slug} onPreview={onPreview} /> : <p className="text-[14px] text-muted">지금은 상담을 쓸 수 없어요.</p>}
    </StepFrame>
  );
}
