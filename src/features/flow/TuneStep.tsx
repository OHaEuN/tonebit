"use client";

import type { ReactNode } from "react";
import { Disclosure } from "@/components/Disclosure";
import { BUTTON } from "@/components/styles";
import { explainTone } from "@/features/analysis/explain";
import { FeedbackForm } from "@/features/feedback/FeedbackForm";
import { ShotsPanel } from "@/features/try/ShotsPanel";
import { useAnalysisStore } from "@/stores/analysisStore";
import { StepFrame } from "./StepFrame";
import { useToneLabel } from "./useToneLabel";

export interface TuneStepProps {
  onAddPhotos: (files: File[]) => void;
  onMeasureMore: () => void;
  photos: { id: number; thumb: string }[];
  /** 흰색 기준 맞추기. 사진으로 했을 때만 있다 */
  whiteFix?: ReactNode;
  /** 형광등·전구색처럼 조명 색이 섞여 흰색 기준이 꼭 필요할 때. 접지 않고 펼쳐 둔다 */
  whiteFixUrgent?: boolean;
}

/** 곁가지: 정확도 높이기. 사진 추가, 흰색 기준, 왜 이렇게 나왔나, 반응·전문가 진단, 다시 측정 */
export function TuneStep({ onAddPhotos, onMeasureMore, photos, whiteFix, whiteFixUrgent }: TuneStepProps) {
  const tone = useToneLabel();
  const result = useAnalysisStore((s) => s.result)!;
  const source = useAnalysisStore((s) => s.source);
  const remeasure = useAnalysisStore((s) => s.remeasure);
  return (
    <StepFrame context={tone} title="정확도 높이기" body="사진을 더하거나 흰 종이를 찍으면 더 정확해져요." onBack={() => window.history.back()}>
      <div className="space-y-6">
        <ShotsPanel onAddPhotos={onAddPhotos} onMeasureMore={onMeasureMore} photos={photos} />
        <div className="border-b border-line">
          {whiteFix && (
            <Disclosure
              key={whiteFixUrgent ? "urgent" : "normal"}
              title="흰색 기준으로 더 정확하게"
              hint={whiteFixUrgent ? "조명 색이 섞인 사진이라 맞추는 걸 권해요" : "사진 속 흰 종이나 흰 벽을 눌러요"}
              defaultOpen={whiteFixUrgent}
            >
              {whiteFix}
            </Disclosure>
          )}
          <Disclosure title="왜 이렇게 나왔나요">
            <ul className="list-disc space-y-1.5 pl-5 leading-relaxed">
              {explainTone(result).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Disclosure>
          <FeedbackForm />
        </div>
        {source === "camera" && (
          <button type="button" onClick={remeasure} className={BUTTON.secondary}>
            다시 측정
          </button>
        )}
      </div>
    </StepFrame>
  );
}
