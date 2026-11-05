"use client";

import { AskStep } from "@/features/flow/AskStep";
import { FeelStep } from "@/features/flow/FeelStep";
import { MatchStep } from "@/features/flow/MatchStep";
import { PickStep } from "@/features/flow/PickStep";
import { TextureStep } from "@/features/flow/TextureStep";
import { ToneStep } from "@/features/flow/ToneStep";
import { TuneStep, type TuneStepProps } from "@/features/flow/TuneStep";
import { useAnalysisStore } from "@/stores/analysisStore";
import { TryOnControls } from "./TryOnControls";

interface ResultPanelProps extends TuneStepProps {
  /** 사진을 크게 보여 준다(AI 상담에서 발라 본 제품 확인) */
  onPreview: () => void;
}

/** 측정이 끝난 뒤의 화면. 단계(step)마다 한 화면에 한 가지 일만 보여 준다 */
export function ResultPanel({ onPreview, ...tune }: ResultPanelProps) {
  const step = useAnalysisStore((s) => s.step);
  const setStep = useAnalysisStore((s) => s.setStep);
  const result = useAnalysisStore((s) => s.result);
  if (!result) return null;

  switch (step) {
    case "tone":
      return <ToneStep />;
    case "feel":
      return <FeelStep />;
    case "texture":
      return <TextureStep />;
    case "pick":
      return <PickStep />;
    case "match":
      return <MatchStep />;
    case "tryon":
      return <TryOnControls onShowResult={() => setStep("match")} />;
    case "tune":
      return <TuneStep {...tune} />;
    case "ask":
      return <AskStep onPreview={onPreview} />;
  }
}
