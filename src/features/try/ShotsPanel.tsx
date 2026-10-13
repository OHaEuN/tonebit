"use client";

import { MAX_SHOTS, RECOMMENDED_SHOTS } from "@/features/analysis/shots";
import { SEASON_INFO } from "@/features/recommend/palettes";
import { useAnalysisStore } from "@/stores/analysisStore";
import type { Season } from "@/types/analysis";
import { UploadButton } from "./UploadButton";

interface ShotsPanelProps {
  onAddPhoto: (file: File) => void;
  onMeasureMore: () => void;
}

/** 몇 장을 합친 결과인지, 장마다 갈렸는지 보여 주고 한 장 더 받는다 */
export function ShotsPanel({ onAddPhoto, onMeasureMore }: ShotsPanelProps) {
  const shots = useAnalysisStore((s) => s.shots);
  const votes = useAnalysisStore((s) => s.votes);
  const source = useAnalysisStore((s) => s.source);
  const n = shots.length;
  const entries = Object.entries(votes) as [Season, number][];
  const split = entries.length > 1;
  const addLabel = n < RECOMMENDED_SHOTS ? `(${n}/${RECOMMENDED_SHOTS})` : "";

  return (
    <div className="space-y-3 rounded-2xl border border-line p-4 text-sm">
      <p>
        {n === 1 ? "사진 1장으로 본 결과예요." : `${n}${source === "camera" ? "번 측정을" : "장을"} 합친 결과예요.`}
        {n < RECOMMENDED_SHOTS && (
          <span className="text-muted"> 다른 장소나 시간에 찍은 사진을 더하면 조명 운에 덜 흔들려서 더 정확해져요.</span>
        )}
      </p>
      {n > 1 && (
        <p className="flex flex-wrap gap-1.5">
          {entries
            .sort((a, b) => b[1] - a[1])
            .map(([season, count]) => (
              <span key={season} className="rounded-full bg-card px-2.5 py-1 text-xs font-medium" style={{ color: SEASON_INFO[season].accent }}>
                {SEASON_INFO[season].label} {SEASON_INFO[season].tone} {count}
              </span>
            ))}
        </p>
      )}
      {split && (
        <p className="rounded-xl bg-amber-50 p-3 text-amber-900">
          사진마다 결과가 갈렸어요. 두 톤의 경계에 있어서 모든 사진의 가운데 값으로 판정했어요.
        </p>
      )}
      {n < MAX_SHOTS &&
        (source === "camera" ? (
          <button
            type="button"
            onClick={onMeasureMore}
            className="rounded-full border border-line bg-card px-5 py-3 font-medium hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            한 번 더 측정해서 합치기 {addLabel}
          </button>
        ) : (
          <UploadButton onFile={onAddPhoto} label={`사진 추가해서 합치기 ${addLabel}`.trim()} />
        ))}
    </div>
  );
}
