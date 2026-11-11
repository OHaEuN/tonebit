"use client";

import Link from "next/link";
import { BUTTON } from "@/components/styles";
import { seasonOdds } from "@/features/analysis/tone";
import { ResultReaction } from "@/features/feedback/ResultReaction";
import { PaletteBand } from "@/features/recommend/PaletteBand";
import { SEASON_INFO, sortSwatches, TONE_INFO, toneLabel } from "@/features/recommend/palettes";
import { resultPath } from "@/features/share/resultUrl";
import { SeasonOdds } from "@/features/try/SeasonOdds";
import { ShotTabs, type ShotTabsProps } from "@/features/try/ShotTabs";
import { useAnalysisStore } from "@/stores/analysisStore";
import { StepFrame } from "./StepFrame";

const UNDERTONE_LABEL = { warm: "웜톤", cool: "쿨톤" } as const;

/**
 * 1단계 퍼스널 컬러 결과. 톤 이름을 크게, 웜·쿨을 문장으로. 다음 일은 "어울리는 립 찾기" 하나.
 * 여러 장을 합쳤으면 머리말에 장수를 적고 사진별 탭을 둬서 마지막 사진만 쓴 것처럼 보이지 않게 한다
 */
export function ToneStep({ photos }: ShotTabsProps) {
  const result = useAnalysisStore((s) => s.result)!;
  const setStep = useAnalysisStore((s) => s.setStep);
  const n = useAnalysisStore((s) => s.shots.length);
  const source = useAnalysisStore((s) => s.source);
  const view = useAnalysisStore((s) => s.view);
  const split = useAnalysisStore((s) => Object.keys(s.votes).length > 1);
  const { season, subtype, tone } = result;
  const info = SEASON_INFO[season];
  const odds = seasonOdds(result.lab, result.reference ?? "none");
  const unit = source === "camera" ? "번 측정" : "장";
  const kicker = view !== null ? `${source === "camera" ? "측정 한 번" : "사진 한 장"}으로 본 내 퍼스널 컬러` : n > 1 ? `${source === "camera" ? "" : "사진 "}${n}${unit}을 합친 내 퍼스널 컬러` : "내 퍼스널 컬러";
  // 뉴트럴은 노란기(b*)가 많은 쪽을 웜으로 본다. 시즌 이름과 어긋나 보이지 않게 그 이유까지 적는다
  const warmSide = season === "spring" || season === "autumn";
  const verdict =
    result.undertone === "neutral"
      ? `웜과 쿨의 중간인 뉴트럴이에요. 노란기가 ${warmSide ? "조금 더 있어 웜" : "적어 쿨"} 쪽으로 봤어요.`
      : `${UNDERTONE_LABEL[result.undertone]} 피부예요.`;
  return (
    <StepFrame
      index={1}
      kicker={kicker}
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
      {n > 1 && (
        <div className="mb-5">
          <ShotTabs photos={photos} />
        </div>
      )}
      <PaletteBand swatches={sortSwatches(info.lips, subtype)} size={46} />
      <div className="mt-4">
        <SeasonOdds season={season} odds={odds} />
      </div>
      <p className="mt-5 break-keep text-[15px] leading-relaxed">{TONE_INFO[tone].summary}</p>
      {result.confidence === "low" && !split && (
        <p className="mt-3 border-l-2 border-amber-500 pl-3 text-[13px] leading-relaxed text-amber-900">
          두 톤의 경계예요. 사진을 더하면 더 또렷해져요.
        </p>
      )}
      {/* 측정을 끝낸 모두에게 한 번 묻는다. 정확도 높이기에만 두면 거기까지 들어온 사람의 반응만 모인다 */}
      <ResultReaction key={`${result.tone}-${result.reference}`} />
    </StepFrame>
  );
}
