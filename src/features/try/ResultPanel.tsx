"use client";

import Link from "next/link";
import { explainTone } from "@/features/analysis/explain";
import { ColorPicker } from "@/features/lipTryOn/ColorPicker";
import { productSwatches } from "@/features/recommend/getProducts";
import { CONFIDENCE_LABEL, SEASON_INFO, sortSwatches, TONE_INFO, toneLabel } from "@/features/recommend/palettes";
import { resultPath } from "@/features/share/resultUrl";
import { useAnalysisStore } from "@/stores/analysisStore";

const BUTTON = "rounded-lg px-5 py-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function ResultPanel() {
  const result = useAnalysisStore((s) => s.result);
  const lipId = useAnalysisStore((s) => s.lipId);
  const blushId = useAnalysisStore((s) => s.blushId);
  const selectLip = useAnalysisStore((s) => s.selectLip);
  const selectBlush = useAnalysisStore((s) => s.selectBlush);
  const remeasure = useAnalysisStore((s) => s.remeasure);
  const source = useAnalysisStore((s) => s.source);
  if (!result) return null;

  const { season, subtype, tone } = result;
  const seasonInfo = SEASON_INFO[season];
  const toneInfo = TONE_INFO[tone];

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

      <details open className="rounded-2xl bg-card p-4 text-sm">
        <summary className="cursor-pointer font-medium">왜 이렇게 나왔나요</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          {explainTone(result).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>

      <p className="text-sm">{toneInfo.summary}</p>

      <ColorPicker
        name="lip"
        label="립 발라보기"
        sections={[
          { title: "시즌 팔레트", swatches: sortSwatches(seasonInfo.lips, subtype) },
          { title: "많이 찾는 제품", swatches: productSwatches(season, "lip") },
        ]}
        value={lipId}
        onChange={selectLip}
      />
      <ColorPicker
        name="blush"
        label="블러셔 발라보기"
        sections={[
          { title: "시즌 팔레트", swatches: sortSwatches(seasonInfo.blushes, subtype) },
          { title: "많이 찾는 제품", swatches: productSwatches(season, "blush") },
        ]}
        value={blushId}
        onChange={selectBlush}
      />
      <p className="text-xs text-muted">제품 색은 공식 색상명 기준 근사치예요. 실제 발색과 다를 수 있어요.</p>

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
