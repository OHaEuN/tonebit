"use client";

import Link from "next/link";
import { BUTTON } from "@/components/styles";
import { seasonOdds } from "@/features/analysis/tone";
import { PaletteBand } from "@/features/recommend/PaletteBand";
import { SEASON_INFO, sortSwatches, TONE_INFO, toneLabel } from "@/features/recommend/palettes";
import { resultPath } from "@/features/share/resultUrl";
import { SeasonOdds } from "@/features/try/SeasonOdds";
import { useAnalysisStore } from "@/stores/analysisStore";
import { StepFrame } from "./StepFrame";

const UNDERTONE_LABEL = { warm: "웜톤", cool: "쿨톤", neutral: "뉴트럴에 가까운" } as const;

/** 1단계 퍼스널 컬러 결과. 톤 이름을 크게, 웜·쿨을 문장으로. 다음 일은 "어울리는 립 찾기" 하나 */
export function ToneStep() {
  const result = useAnalysisStore((s) => s.result)!;
  const setStep = useAnalysisStore((s) => s.setStep);
  const { season, subtype, tone } = result;
  const info = SEASON_INFO[season];
  const odds = seasonOdds(result.lab, result.reference ?? "none");
  const verdict =
    result.undertone === "neutral"
      ? "웜과 쿨의 중간인 뉴트럴 피부예요."
      : `${UNDERTONE_LABEL[result.undertone]} 피부예요.`;
  return (
    <StepFrame
      index={1}
      kicker="내 퍼스널 컬러"
      title={
        <span className="flex items-center gap-2.5">
          <span aria-hidden="true" className="inline-block size-3 shrink-0 rounded-full" style={{ background: info.accent }} />
          {toneLabel(season, subtype)}
        </span>
      }
      body={verdict}
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
      <PaletteBand swatches={sortSwatches(info.lips, subtype)} size={46} />
      <div className="mt-4">
        <SeasonOdds season={season} odds={odds} />
      </div>
      <p className="mt-5 break-keep text-[15px] leading-relaxed">{TONE_INFO[tone].summary}</p>
      {result.confidence === "low" && (
        <p className="mt-3 border-l-2 border-amber-500 pl-3 text-[13px] leading-relaxed text-amber-900">
          두 톤의 경계예요. 사진을 더하면 더 또렷해져요.
        </p>
      )}
    </StepFrame>
  );
}
