"use client";

import { REFERENCE_LABEL } from "@/features/analysis/reference";
import { useAnalysisStore } from "@/stores/analysisStore";

export function AdvancedPanel() {
  const debug = useAnalysisStore((s) => s.debug);
  const fps = useAnalysisStore((s) => s.fps);
  const result = useAnalysisStore((s) => s.result);
  const source = useAnalysisStore((s) => s.source);
  const setDebug = useAnalysisStore((s) => s.setDebug);

  return (
    <details className="text-[13px] text-muted">
      <summary className="cursor-pointer">측정값 자세히</summary>
      <div className="mt-3 space-y-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
          랜드마크·샘플 영역 표시
        </label>
        {source === "camera" && <p className="text-muted">{fps} fps</p>}
        {result && (
          <p className="font-mono text-xs text-muted">
            L* {result.lab.L.toFixed(1)} a* {result.lab.a.toFixed(1)} b* {result.lab.b.toFixed(1)} · hue {result.hue.toFixed(1)}° · ITA{" "}
            {result.ita.toFixed(1)}° · {result.depth} · {result.chroma} · {REFERENCE_LABEL[result.reference ?? "none"]}
          </p>
        )}
      </div>
    </details>
  );
}
