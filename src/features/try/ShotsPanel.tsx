"use client";

import { REFERENCE_SHORT } from "@/features/analysis/reference";
import { MAX_SHOTS, RECOMMENDED_SHOTS, shotReference, shotResult } from "@/features/analysis/shots";
import { SEASON_INFO } from "@/features/recommend/palettes";
import { useAnalysisStore } from "@/stores/analysisStore";
import { UploadButton } from "./UploadButton";

interface ShotsPanelProps {
  onAddPhotos: (files: File[]) => void;
  onMeasureMore: () => void;
  /** 업로드한 사진의 미리보기. 카메라 측정엔 없다 */
  photos: { id: number; thumb: string }[];
}

const TAB =
  "flex shrink-0 flex-col items-center gap-1 rounded-2xl border p-1.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/**
 * 몇 장을 합친 결과인지 보여 주고, 합친 결과와 사진 한 장씩의 결과를 오가게 한다.
 * 장마다 시즌이 갈렸으면 경계에 있다고 알려 주고 한 장 더 받는다
 */
export function ShotsPanel({ onAddPhotos, onMeasureMore, photos }: ShotsPanelProps) {
  const shots = useAnalysisStore((s) => s.shots);
  const votes = useAnalysisStore((s) => s.votes);
  const source = useAnalysisStore((s) => s.source);
  const view = useAnalysisStore((s) => s.view);
  const combined = useAnalysisStore((s) => s.combined);
  const setView = useAnalysisStore((s) => s.setView);
  const n = shots.length;
  const unit = source === "camera" ? "번 측정" : "장";
  const split = Object.keys(votes).length > 1;
  const room = MAX_SHOTS - n;
  const progress = n < RECOMMENDED_SHOTS ? ` (${n}/${RECOMMENDED_SHOTS})` : "";

  return (
    <div className="space-y-3 rounded-2xl border border-line p-4 text-sm">
      <p>
        {n === 1 ? `${source === "camera" ? "측정 1번" : "사진 1장"}으로 본 결과예요.` : `${n}${unit}을 합친 결과예요.`}
        {n < RECOMMENDED_SHOTS && <span className="text-muted"> 다른 장소나 시간에 찍은 사진을 더하면 조명 운에 덜 흔들려서 더 정확해져요.</span>}
      </p>

      {n > 1 && (
        <div role="tablist" aria-label="사진별 결과" className="relative -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            role="tab"
            aria-selected={view === null}
            onClick={() => setView(null)}
            className={`${TAB} justify-center px-3 ${view === null ? "border-fg bg-fg text-white" : "border-line bg-card"}`}
          >
            <span className="text-sm font-semibold">합친 결과</span>
            {combined && <span className={view === null ? "text-white/80" : "text-muted"}>{SEASON_INFO[combined.season].label} {SEASON_INFO[combined.season].tone}</span>}
          </button>
          {shots.map((shot, i) => {
            const r = shotResult(shot);
            const thumb = photos.find((p) => p.id === shot.id)?.thumb;
            const active = view === shot.id;
            return (
              <button
                key={shot.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`${i + 1}번째 ${source === "camera" ? "측정" : "사진"} 결과: ${SEASON_INFO[r.season].label} ${SEASON_INFO[r.season].tone}`}
                onClick={() => setView(shot.id)}
                className={`${TAB} ${active ? "border-fg ring-2 ring-fg" : "border-line bg-card"}`}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 기기 안에서 만든 data URL 미리보기라 next/image가 필요 없다
                  <img src={thumb} alt="" className="h-14 w-auto rounded-xl object-cover" />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-bg font-semibold">{i + 1}</span>
                )}
                <span className="font-medium" style={{ color: SEASON_INFO[r.season].accent }}>
                  {SEASON_INFO[r.season].label} {SEASON_INFO[r.season].tone}
                </span>
                {REFERENCE_SHORT[shotReference(shot)] && <span className="text-[10px] text-muted">{REFERENCE_SHORT[shotReference(shot)]}</span>}
              </button>
            );
          })}
        </div>
      )}

      {view !== null && <p className="text-xs text-muted">이 사진 한 장만 본 결과예요. 합친 결과가 더 믿을 만해요.</p>}

      {split && view === null && (
        <p className="rounded-xl bg-amber-50 p-3 text-amber-900">
          사진마다 결과가 갈렸어요. 두 톤의 경계에 있어서 모든 사진의 가운데 값으로 판정했어요. 사진을 눌러 한 장씩 볼 수 있어요.
        </p>
      )}

      {room > 0 &&
        (source === "camera" ? (
          <button
            type="button"
            onClick={onMeasureMore}
            className="rounded-full border border-line bg-card px-5 py-3 font-medium hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            한 번 더 측정해서 합치기{progress}
          </button>
        ) : (
          <UploadButton onFiles={onAddPhotos} multiple label={`사진 추가해서 합치기${progress}`} />
        ))}
    </div>
  );
}
