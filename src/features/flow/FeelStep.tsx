"use client";

import { FEEL_LABEL, type Feel } from "@/features/recommend/preference";
import { useTasteStore } from "@/features/recommend/tasteStore";
import { SwatchSmear } from "@/features/swatch/SwatchSmear";
import { useAnalysisStore } from "@/stores/analysisStore";
import { OptionList } from "./OptionList";
import { StepFrame } from "./StepFrame";
import { useToneLabel } from "./useToneLabel";

/** 느낌별 보기 색. 점수와 무관한 그림 */
const SAMPLE: Record<Feel, string[]> = {
  natural: ["#B37469", "#C27384", "#B06A6E"],
  vivid: ["#E98775", "#E39DAE", "#D97C92"],
  bold: ["#C8283E", "#8E2C44", "#A94A3E"],
};
const FEELS: Feel[] = ["natural", "vivid", "bold"];

/** 2단계 원하는 느낌. 답 하나가 밝기·채도 최적점과 인상 항을 바꾼다 */
export function FeelStep() {
  const tone = useToneLabel();
  const setStep = useAnalysisStore((s) => s.setStep);
  const setTaste = useTasteStore((s) => s.setTaste);
  return (
    <StepFrame context={tone} index={2} title="어떤 느낌의 립을 원해요?" body="평소 손이 가는 쪽이면 돼요." onBack={() => window.history.back()}>
      <OptionList
        label="원하는 느낌"
        options={FEELS.map((key) => ({
          key,
          ...FEEL_LABEL[key],
          visual: (
            <span className="flex">
              {SAMPLE[key].map((hex, i) => (
                <SwatchSmear key={hex} color={hex} width={36} height={36} seed={i + 2} finish={i === 1 ? "gloss" : "cream"} className={i ? "-ml-2" : ""} />
              ))}
            </span>
          ),
        }))}
        onPick={(feel) => {
          setTaste({ feel });
          setStep("texture");
        }}
      />
    </StepFrame>
  );
}
