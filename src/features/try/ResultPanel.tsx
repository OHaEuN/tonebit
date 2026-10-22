"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AdvisorPanel } from "@/features/advisor/AdvisorPanel";
import { explainTone } from "@/features/analysis/explain";
import { FeedbackForm } from "@/features/feedback/FeedbackForm";
import { ApplyControls } from "@/features/lipTryOn/ApplyControls";
import { ColorPicker } from "@/features/lipTryOn/ColorPicker";
import { BLUSH_STYLES, LIP_STYLES } from "@/features/lipTryOn/render";
import { CONFIDENCE_LABEL, SEASON_INFO, SEASONS, TONE_INFO, toneLabel } from "@/features/recommend/palettes";
import { resultPath } from "@/features/share/resultUrl";
import { useAnalysisStore } from "@/stores/analysisStore";
import { ShotsPanel } from "./ShotsPanel";
import { useTrySwatches, type Part } from "./useTrySwatches";

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
  /** 사진을 크게 보여 준다(AI 상담에서 발라 본 제품 확인) */
  onPreview: () => void;
}

/** 결과는 "결과"와 "발라 보기" 두 탭으로 나눠 한 화면에 한 가지 일만 보이게 한다 */
export function ResultPanel({ onAddPhotos, onMeasureMore, photos, whiteFix, onPreview }: ResultPanelProps) {
  const [tab, setTab] = useState<Tab>("result");
  const result = useAnalysisStore((s) => s.result);
  const remeasure = useAnalysisStore((s) => s.remeasure);
  const source = useAnalysisStore((s) => s.source);
  if (!result) return null;

  const { season, subtype, tone } = result;
  const seasonInfo = SEASON_INFO[season];

  return (
    <section aria-labelledby="result-heading" className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">재미로 보는 결과</p>
          <h2 id="result-heading" className="text-3xl font-semibold" style={{ color: seasonInfo.accent }}>
            {toneLabel(season, subtype)}
          </h2>
        </div>
        <p className="shrink-0 pb-1 text-sm">
          확신도 <strong>{CONFIDENCE_LABEL[result.confidence]}</strong>
        </p>
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
          <AdvisorPanel key={tone} onPreview={onPreview} />
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

/** 발라 보기: 팔레트 시즌, 립/블러셔 전환, 색·바르는 방법·진하기를 한 화면 높이 안에 둔다 */
function TryOnControls({ onShowResult }: { onShowResult: () => void }) {
  const [part, setPart] = useState<Part>("lip");
  const result = useAnalysisStore((s) => s.result)!;
  const lipId = useAnalysisStore((s) => s.lipId);
  const blushId = useAnalysisStore((s) => s.blushId);
  const lipStyle = useAnalysisStore((s) => s.lipStyle);
  const blushStyle = useAnalysisStore((s) => s.blushStyle);
  const lipIntensity = useAnalysisStore((s) => s.lipIntensity);
  const blushIntensity = useAnalysisStore((s) => s.blushIntensity);
  const paletteSeason = useAnalysisStore((s) => s.paletteSeason);
  const selectLip = useAnalysisStore((s) => s.selectLip);
  const selectBlush = useAnalysisStore((s) => s.selectBlush);
  const setLipStyle = useAnalysisStore((s) => s.setLipStyle);
  const setBlushStyle = useAnalysisStore((s) => s.setBlushStyle);
  const setLipIntensity = useAnalysisStore((s) => s.setLipIntensity);
  const setBlushIntensity = useAnalysisStore((s) => s.setBlushIntensity);
  const setPaletteSeason = useAnalysisStore((s) => s.setPaletteSeason);

  const sections = useTrySwatches(part);
  const { season } = result;
  const shown = paletteSeason ?? season;
  const isLip = part === "lip";

  return (
    <div className="space-y-4">
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-medium">
          팔레트
          <span className="ml-2 font-normal text-muted">다른 시즌 색과 비교해 보세요</span>
        </legend>
        <div className="relative -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {SEASONS.map((s) => {
            const info = SEASON_INFO[s];
            return (
              <label key={s} className="shrink-0 cursor-pointer">
                <input
                  type="radio"
                  name="palette-season"
                  className="peer sr-only"
                  checked={s === shown}
                  onChange={() => setPaletteSeason(s === season ? null : s)}
                />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm peer-checked:border-fg peer-checked:bg-fg peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2">
                  <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: info.accent }} />
                  {info.label} {info.tone}
                  {s === season && <span className="text-xs opacity-70">내 톤</span>}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div role="tablist" aria-label="바를 곳" className="flex gap-1 rounded-full bg-card p-1">
        {(
          [
            ["lip", "립"],
            ["blush", "블러셔"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={part === key}
            onClick={() => setPart(key)}
            className={`${SEGMENT} ${part === key ? "bg-bg shadow-sm" : "text-muted hover:text-fg"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <ColorPicker
        key={part}
        name={part}
        label={isLip ? "립" : "블러셔"}
        sections={sections}
        value={isLip ? lipId : blushId}
        onChange={isLip ? selectLip : selectBlush}
      />
      {isLip ? (
        <ApplyControls name="립" styles={LIP_STYLES} style={lipStyle} onStyle={setLipStyle} intensity={lipIntensity} onIntensity={setLipIntensity} />
      ) : (
        <ApplyControls name="블러셔" styles={BLUSH_STYLES} style={blushStyle} onStyle={setBlushStyle} intensity={blushIntensity} onIntensity={setBlushIntensity} />
      )}

      <p className="text-xs text-muted">사진을 꾹 누르고 있으면 바르기 전 모습이 보여요. 제품 색은 공식 색상명 기준 근사치예요.</p>
      <button type="button" onClick={onShowResult} className="text-sm text-accent hover:underline">
        ← 결과로 돌아가기
      </button>
    </div>
  );
}
