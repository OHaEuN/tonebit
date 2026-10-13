"use client";

import Link from "next/link";
import { ColorPicker } from "@/features/lipTryOn/ColorPicker";
import { CONFIDENCE_LABEL, SEASON_INFO } from "@/features/recommend/palettes";
import { resultPath } from "@/features/share/resultUrl";
import { useAnalysisStore } from "@/stores/analysisStore";

export function ResultPanel() {
  const result = useAnalysisStore((s) => s.result);
  const lipId = useAnalysisStore((s) => s.lipId);
  const blushId = useAnalysisStore((s) => s.blushId);
  const selectLip = useAnalysisStore((s) => s.selectLip);
  const selectBlush = useAnalysisStore((s) => s.selectBlush);
  const remeasure = useAnalysisStore((s) => s.remeasure);
  const source = useAnalysisStore((s) => s.source);
  if (!result) return null;

  const info = SEASON_INFO[result.season];
  return (
    <section aria-labelledby="result-heading" className="space-y-5">
      <div>
        <p className="text-sm text-muted">재미로 보는 결과</p>
        <h2 id="result-heading" className="text-3xl font-bold" style={{ color: info.accent }}>
          {info.label} {info.tone}
        </h2>
        <p className="mt-1 text-muted">{info.tagline}</p>
        <p className="mt-2 text-sm">
          확신도 <strong>{CONFIDENCE_LABEL[result.confidence]}</strong>
          {result.undertone === "neutral" && " · 웜과 쿨의 중간, 뉴트럴에 가까워요"}
        </p>
      </div>
      <ColorPicker name="lip" label="립 컬러 발라보기" swatches={info.lips} value={lipId} onChange={selectLip} />
      <ColorPicker name="blush" label="블러셔" swatches={info.blushes} value={blushId} onChange={selectBlush} />
      <div className="flex flex-wrap gap-2">
        <Link
          href={resultPath(result.season)}
          className="rounded-full bg-accent px-5 py-3 font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          결과 카드 보기
        </Link>
        {source === "camera" && (
          <button
            type="button"
            onClick={remeasure}
            className="rounded-full border border-line bg-card px-5 py-3 font-medium hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            다시 측정
          </button>
        )}
      </div>
    </section>
  );
}
