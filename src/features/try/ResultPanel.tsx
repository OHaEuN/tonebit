"use client";

import Link from "next/link";
import { explainTone } from "@/features/analysis/explain";
import { ApplyControls } from "@/features/lipTryOn/ApplyControls";
import { ColorPicker } from "@/features/lipTryOn/ColorPicker";
import { BLUSH_STYLES, LIP_STYLES } from "@/features/lipTryOn/render";
import { productSwatches } from "@/features/recommend/getProducts";
import { CONFIDENCE_LABEL, SEASON_INFO, SEASONS, sortSwatches, TONE_INFO, toneLabel } from "@/features/recommend/palettes";
import { resultPath } from "@/features/share/resultUrl";
import { FeedbackForm } from "@/features/feedback/FeedbackForm";
import { ShotsPanel } from "./ShotsPanel";
import { useAnalysisStore } from "@/stores/analysisStore";

const BUTTON = "rounded-lg px-5 py-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

interface ResultPanelProps {
  onAddPhotos: (files: File[]) => void;
  onMeasureMore: () => void;
  photos: { id: number; thumb: string }[];
}

export function ResultPanel({ onAddPhotos, onMeasureMore, photos }: ResultPanelProps) {
  const result = useAnalysisStore((s) => s.result);
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
  const remeasure = useAnalysisStore((s) => s.remeasure);
  const source = useAnalysisStore((s) => s.source);
  if (!result) return null;

  const { season, subtype, tone } = result;
  const seasonInfo = SEASON_INFO[season];
  const toneInfo = TONE_INFO[tone];
  const shown = paletteSeason ?? season;
  const shownInfo = SEASON_INFO[shown];
  const isMine = shown === season;

  return (
    <section aria-labelledby="result-heading" className="space-y-6">
      <div>
        <p className="text-sm text-muted">재미로 보는 결과</p>
        <h2 id="result-heading" className="text-3xl font-semibold" style={{ color: seasonInfo.accent }}>
          {toneLabel(season, subtype)}
        </h2>
        <p className="mt-1 text-muted">{seasonInfo.tagline}</p>
        <p className="mt-2 text-sm">
          확신도 <strong>{CONFIDENCE_LABEL[result.confidence]}</strong>
          {result.undertone === "neutral" && ". 웜과 쿨의 중간, 뉴트럴에 가까워요"}
        </p>
      </div>

      <ShotsPanel onAddPhotos={onAddPhotos} onMeasureMore={onMeasureMore} photos={photos} />

      <details open className="rounded-2xl bg-card p-4 text-sm">
        <summary className="cursor-pointer font-medium">왜 이렇게 나왔나요</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          {explainTone(result).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>

      <p className="text-sm">{toneInfo.summary}</p>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">
          발라볼 팔레트
          <span className="ml-2 font-normal text-muted">다른 시즌 색과 비교하면 내 톤이 정말 맞는지 보여요</span>
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {SEASONS.map((s) => {
            const info = SEASON_INFO[s];
            const active = s === shown;
            return (
              <label key={s} className="cursor-pointer">
                <input
                  type="radio"
                  name="palette-season"
                  className="peer sr-only"
                  checked={active}
                  onChange={() => setPaletteSeason(s === season ? null : s)}
                />
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm peer-checked:border-fg peer-checked:bg-fg peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2"
                >
                  <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: info.accent }} />
                  {info.label} {info.tone}
                  {s === season && <span className="text-xs opacity-70">내 톤</span>}
                </span>
              </label>
            );
          })}
        </div>
        {!isMine && <p className="mt-2 text-xs text-muted">지금은 {shownInfo.label} {shownInfo.tone} 팔레트를 보고 있어요.</p>}
      </fieldset>

      <ColorPicker
        name="lip"
        label="립"
        sections={[
          { title: `${shownInfo.label} ${shownInfo.tone} 팔레트`, swatches: isMine ? sortSwatches(shownInfo.lips, subtype) : shownInfo.lips },
          { title: "많이 찾는 제품", swatches: productSwatches(shown, "lip") },
        ]}
        value={lipId}
        onChange={selectLip}
      />
      <ApplyControls name="립" styles={LIP_STYLES} style={lipStyle} onStyle={setLipStyle} intensity={lipIntensity} onIntensity={setLipIntensity} />
      <ColorPicker
        name="blush"
        label="블러셔"
        sections={[
          { title: `${shownInfo.label} ${shownInfo.tone} 팔레트`, swatches: isMine ? sortSwatches(shownInfo.blushes, subtype) : shownInfo.blushes },
          { title: "많이 찾는 제품", swatches: productSwatches(shown, "blush") },
        ]}
        value={blushId}
        onChange={selectBlush}
      />
      <ApplyControls
        name="블러셔"
        styles={BLUSH_STYLES}
        style={blushStyle}
        onStyle={setBlushStyle}
        intensity={blushIntensity}
        onIntensity={setBlushIntensity}
      />

      <p className="text-xs text-muted">제품 색은 공식 색상명 기준 근사치예요. 실제 발색과 다를 수 있어요.</p>

      <FeedbackForm />

      <div className="flex flex-wrap gap-2">
        <Link href={resultPath(tone)} className={`${BUTTON} bg-accent text-white hover:opacity-90`}>
          결과 카드와 추천 보기
        </Link>
        {source === "camera" && (
          <button type="button" onClick={remeasure} className={`${BUTTON} border border-line bg-card hover:bg-accent-soft`}>
            다시 측정
          </button>
        )}
      </div>
    </section>
  );
}
