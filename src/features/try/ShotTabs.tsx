"use client";

import { shotResult } from "@/features/analysis/shots";
import { SEASON_INFO } from "@/features/recommend/palettes";
import { useAnalysisStore } from "@/stores/analysisStore";

export interface ShotTabsProps {
  /** 업로드한 사진의 미리보기. 카메라 측정엔 없다 */
  photos: { id: number; thumb: string }[];
}

const TAB =
  "flex shrink-0 flex-col items-center gap-1 rounded-2xl border p-1.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/**
 * 합친 결과와 사진(측정) 한 장씩의 결과를 오가는 탭. 두 장 이상일 때만 그린다.
 * 장마다 시즌이 갈렸으면 가운데 값으로 판정했다고 알려 준다
 */
export function ShotTabs({ photos }: ShotTabsProps) {
  const shots = useAnalysisStore((s) => s.shots);
  const votes = useAnalysisStore((s) => s.votes);
  const source = useAnalysisStore((s) => s.source);
  const view = useAnalysisStore((s) => s.view);
  const combined = useAnalysisStore((s) => s.combined);
  const setView = useAnalysisStore((s) => s.setView);
  if (shots.length < 2) return null;
  const unit = source === "camera" ? "측정" : "사진";
  const split = Object.keys(votes).length > 1;

  return (
    <div className="space-y-3 text-sm">
      <div role="tablist" aria-label={`${unit}별 결과`} className="relative -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          role="tab"
          aria-selected={view === null}
          onClick={() => setView(null)}
          className={`${TAB} justify-center px-3 ${view === null ? "border-fg bg-fg text-white" : "border-line"}`}
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
              aria-label={`${i + 1}번째 ${unit} 결과: ${SEASON_INFO[r.season].label} ${SEASON_INFO[r.season].tone}`}
              onClick={() => setView(shot.id)}
              className={`${TAB} ${active ? "border-fg ring-1 ring-fg" : "border-line"}`}
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
            </button>
          );
        })}
      </div>

      {view !== null && <p className="text-xs text-muted">이 {unit} 한 {source === "camera" ? "번" : "장"}만 본 결과예요. 합친 결과가 더 믿을 만해요.</p>}

      {split && view === null && (
        <p className="border-l-2 border-amber-500 pl-3 text-amber-900">
          {unit}마다 결과가 갈려서 가운데 값으로 판정했어요. {unit}을 누르면 한 {source === "camera" ? "번" : "장"}씩 볼 수 있어요.
        </p>
      )}
    </div>
  );
}
