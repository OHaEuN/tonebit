"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { explainTone } from "@/features/analysis/explain";
import { REFERENCE_LABEL } from "@/features/analysis/reference";
import { FeedbackForm } from "@/features/feedback/FeedbackForm";
import { runnerUp, seasonOdds } from "@/features/analysis/tone";
import { HarmonyPicks } from "@/features/recommend/HarmonyPicks";
import { CONFIDENCE_LABEL, SEASON_INFO, TONE_INFO, toneLabel } from "@/features/recommend/palettes";
import { resultPath } from "@/features/share/resultUrl";
import { useAnalysisStore } from "@/stores/analysisStore";
import { ShotsPanel } from "./ShotsPanel";
import { TryOnControls } from "./TryOnControls";

const BUTTON = "rounded-lg px-5 py-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const SEGMENT =
  "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

type Tab = "result" | "tryon";

interface ResultPanelProps {
  onAddPhotos: (files: File[]) => void;
  onMeasureMore: () => void;
  photos: { id: number; thumb: string }[];
  /** 흰색 기준 맞추기 카드. 사진으로 했을 때만 있다 */
  whiteFix?: ReactNode;
}

/** 결과는 "결과"와 "발라 보기" 두 탭으로 나눠 한 화면에 한 가지 일만 보이게 한다 */
export function ResultPanel({ onAddPhotos, onMeasureMore, photos, whiteFix }: ResultPanelProps) {
  const [tab, setTab] = useState<Tab>("result");
  const result = useAnalysisStore((s) => s.result);
  const remeasure = useAnalysisStore((s) => s.remeasure);
  const source = useAnalysisStore((s) => s.source);
  const selectLip = useAnalysisStore((s) => s.selectLip);
  if (!result) return null;

  const { season, subtype, tone } = result;
  const seasonInfo = SEASON_INFO[season];
  const odds = seasonOdds(result.lab, result.reference ?? "none");
  const next = runnerUp(season, odds);
  const percent = (p: number) => `${Math.round(p * 100)}%`;

  return (
    <section aria-labelledby="result-heading" className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">재미로 보는 결과</p>
          <h2 id="result-heading" className="text-3xl font-semibold" style={{ color: seasonInfo.accent }}>
            {toneLabel(season, subtype)}
          </h2>
          <p className="mt-1 text-xs text-muted">
            가능성 {percent(odds[season])} · 다음 후보 {SEASON_INFO[next].label} {SEASON_INFO[next].tone} {percent(odds[next])}
          </p>
        </div>
        <div className="shrink-0 pb-1 text-right text-sm">
          <p>
            확신도 <strong>{CONFIDENCE_LABEL[result.confidence]}</strong>
          </p>
          <p className="text-xs text-muted">{REFERENCE_LABEL[result.reference ?? "none"]}</p>
        </div>
      </div>

      <div role="tablist" aria-label="결과 보기" className="flex gap-1 rounded-full bg-card p-1">
        {(
          [
            ["result", "결과"],
            ["tryon", "발라 보기"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`${SEGMENT} ${tab === key ? "bg-fg text-white" : "text-muted hover:text-fg"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "result" ? (
        <div className="space-y-5">
          <p className="text-sm">
            {TONE_INFO[tone].summary}
            {result.undertone === "neutral" && " 웜과 쿨의 중간, 뉴트럴에 가까워요."}
          </p>
          <button type="button" onClick={() => setTab("tryon")} className={`${BUTTON} w-full bg-accent text-white hover:opacity-90`}>
            어울리는 색 얼굴에 발라 보기
          </button>
          <HarmonyPicks
            onTry={(id) => {
              selectLip(id);
              setTab("tryon");
            }}
          />
          <ShotsPanel onAddPhotos={onAddPhotos} onMeasureMore={onMeasureMore} photos={photos} />
          {whiteFix}
          <details className="rounded-2xl bg-card p-4 text-sm">
            <summary className="cursor-pointer font-medium">왜 이렇게 나왔나요</summary>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              {explainTone(result).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
          <FeedbackForm />
          <div className="flex flex-wrap gap-2">
            <Link href={resultPath(tone)} className={`${BUTTON} border border-line bg-card hover:bg-accent-soft`}>
              결과 카드와 추천 보기
            </Link>
            {source === "camera" && (
              <button type="button" onClick={remeasure} className={`${BUTTON} border border-line bg-card hover:bg-accent-soft`}>
                다시 측정
              </button>
            )}
          </div>
        </div>
      ) : (
        <TryOnControls onShowResult={() => setTab("result")} />
      )}
    </section>
  );
}
