"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Disclosure } from "@/components/Disclosure";
import { AdvisorPanel } from "@/features/advisor/AdvisorPanel";
import { BUTTON } from "@/components/styles";
import { explainTone } from "@/features/analysis/explain";
import { REFERENCE_LABEL } from "@/features/analysis/reference";
import { seasonOdds } from "@/features/analysis/tone";
import { FeedbackForm } from "@/features/feedback/FeedbackForm";
import { ResultReaction } from "@/features/feedback/ResultReaction";
import { HarmonyPicks } from "@/features/recommend/HarmonyPicks";
import { PaletteBand } from "@/features/recommend/PaletteBand";
import { CONFIDENCE_LABEL, SEASON_INFO, sortSwatches, TONE_INFO, toneLabel } from "@/features/recommend/palettes";
import { resultPath } from "@/features/share/resultUrl";
import { useAnalysisStore, type ResultTab } from "@/stores/analysisStore";
import { SeasonOdds } from "./SeasonOdds";
import { ShotsPanel } from "./ShotsPanel";
import { TryOnControls } from "./TryOnControls";

const TABS: [ResultTab, string][] = [
  ["result", "결과"],
  ["tryon", "발라 보기"],
];

interface ResultPanelProps {
  onAddPhotos: (files: File[]) => void;
  onMeasureMore: () => void;
  photos: { id: number; thumb: string }[];
  /** 흰색 기준 맞추기. 사진으로 했을 때만 있다 */
  whiteFix?: ReactNode;
  /** 형광등·전구색처럼 조명 색이 섞여 흰색 기준이 꼭 필요할 때. 접지 않고 펼쳐 둔다 */
  whiteFixUrgent?: boolean;
  /** 사진을 크게 보여 준다(AI 상담에서 발라 본 제품 확인) */
  onPreview: () => void;
}

/** 결과는 "결과"와 "발라 보기" 두 탭으로 나눠 한 화면에 한 가지 일만 보이게 한다 */
export function ResultPanel({ onAddPhotos, onMeasureMore, photos, whiteFix, whiteFixUrgent, onPreview }: ResultPanelProps) {
  const tab = useAnalysisStore((s) => s.resultTab);
  const setTab = useAnalysisStore((s) => s.setResultTab);
  const result = useAnalysisStore((s) => s.result);
  const remeasure = useAnalysisStore((s) => s.remeasure);
  const source = useAnalysisStore((s) => s.source);
  const selectLip = useAnalysisStore((s) => s.selectLip);
  if (!result) return null;

  const { season, subtype, tone } = result;

  return (
    <section aria-labelledby="result-heading">
      <h2 id="result-heading" className="text-[34px] font-semibold leading-tight md:text-[44px]">
        {toneLabel(season, subtype)}
      </h2>
      <PaletteBand swatches={sortSwatches(SEASON_INFO[season].lips, subtype)} size={46} className="mt-4" />
      <div className="mt-3 space-y-0.5">
        <SeasonOdds season={season} odds={seasonOdds(result.lab, result.reference ?? "none")} />
        <p className="text-[13px] text-muted">
          확신도 {CONFIDENCE_LABEL[result.confidence]} · {REFERENCE_LABEL[result.reference ?? "none"]}
        </p>
      </div>
      <ResultReaction key={`${tone}-${result.reference}`} />

      <div role="tablist" aria-label="결과 보기" className="mt-7 flex gap-6 border-b border-line">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 pb-2.5 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              tab === key ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="pt-6">
        {tab === "result" ? (
          <div className="space-y-8">
            <div className="space-y-5">
              <p className="text-[15px] leading-relaxed">
                {TONE_INFO[tone].summary}
                {result.undertone === "neutral" && " 웜과 쿨의 중간, 뉴트럴에 가까워요."}
              </p>
              <button type="button" onClick={() => setTab("tryon")} className={`${BUTTON.primary} w-full`}>
                어울리는 색 얼굴에 발라 보기
              </button>
            </div>

            <HarmonyPicks
              onTry={(id) => {
                selectLip(id);
                setTab("tryon");
              }}
            />

            <AdvisorPanel key={tone} onPreview={onPreview} />

            <ShotsPanel onAddPhotos={onAddPhotos} onMeasureMore={onMeasureMore} photos={photos} />

            <div className="border-b border-line">
              {whiteFix && (
                <Disclosure
                  key={whiteFixUrgent ? "urgent" : "normal"}
                  title="흰색 기준으로 더 정확하게"
                  hint={whiteFixUrgent ? "조명 색이 섞인 사진이라 맞추는 걸 권해요" : "사진 속 흰 종이·흰 벽을 눌러 조명 색을 되돌려요"}
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

            <div className="flex flex-wrap gap-2.5">
              <Link href={resultPath(tone)} className={BUTTON.secondary}>
                결과 카드와 추천 보기
              </Link>
              {source === "camera" && (
                <button type="button" onClick={remeasure} className={BUTTON.secondary}>
                  다시 측정
                </button>
              )}
            </div>
          </div>
        ) : (
          <TryOnControls onShowResult={() => setTab("result")} />
        )}
      </div>
    </section>
  );
}
