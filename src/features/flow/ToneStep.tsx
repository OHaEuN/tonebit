"use client";

import Link from "next/link";
import { BUTTON } from "@/components/styles";
import { REFERENCE_LABEL } from "@/features/analysis/reference";
import { seasonOdds } from "@/features/analysis/tone";
import { PaletteBand } from "@/features/recommend/PaletteBand";
import { CONFIDENCE_LABEL, SEASON_INFO, sortSwatches, TONE_INFO, toneLabel } from "@/features/recommend/palettes";
import { resultPath } from "@/features/share/resultUrl";
import { SeasonOdds } from "@/features/try/SeasonOdds";
import { useAnalysisStore } from "@/stores/analysisStore";
import { StepFrame } from "./StepFrame";

/** 1단계 퍼스널 컬러 결과. 톤 이름과 가능성만 보여 주고, 다음 일은 "어울리는 립 찾기" 하나 */
export function ToneStep() {
  const result = useAnalysisStore((s) => s.result)!;
  const setStep = useAnalysisStore((s) => s.setStep);
  const { season, subtype, tone } = result;
  const odds = seasonOdds(result.lab, result.reference ?? "none");
  return (
    <StepFrame
      index={1}
      title={toneLabel(season, subtype)}
      cta={{ label: "어울리는 립 찾기", onClick: () => setStep("feel") }}
      aside={
        <>
          <button type="button" onClick={() => setStep("tune")} className={BUTTON.text}>
            정확도 높이기
          </button>
          <Link href={resultPath(tone)} className={BUTTON.text}>
            결과 카드와 추천 보기
          </Link>
        </>
      }
    >
      <PaletteBand swatches={sortSwatches(SEASON_INFO[season].lips, subtype)} size={46} />
      <div className="mt-4 space-y-0.5">
        <SeasonOdds season={season} odds={odds} />
        <p className="text-[13px] text-muted">
          확신도 {CONFIDENCE_LABEL[result.confidence]} · {REFERENCE_LABEL[result.reference ?? "none"]}
        </p>
      </div>
      <p className="mt-5 break-keep text-[15px] leading-relaxed">
        {TONE_INFO[tone].summary}
        {result.undertone === "neutral" && " 웜과 쿨의 중간, 뉴트럴에 가까워요."}
      </p>
      {result.confidence === "low" && (
        <p className="mt-3 border-l-2 border-amber-500 pl-3 text-[13px] leading-relaxed text-amber-900">
          두 톤의 경계에 있어요. 사진을 더하거나 흰색 기준을 맞추면 또렷해져요.
        </p>
      )}
    </StepFrame>
  );
}
