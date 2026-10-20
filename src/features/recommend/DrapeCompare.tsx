"use client";

import { useAnalysisStore } from "@/stores/analysisStore";
import { SEASON_INFO } from "./palettes";
import { useDrapeSession } from "./useDrapeSession";

const CHIP =
  "inline-flex items-center gap-2 rounded-full border border-line bg-bg px-3 py-1.5 text-sm peer-checked:border-fg peer-checked:bg-fg peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2";
const BUTTON = "rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/**
 * 두 색 중 골라서 내 톤 확인하기(셀프 드레이핑). 측정이 조명에 흔들려도 내 눈으로 고른 결과는 흔들리지 않는다
 */
export function DrapeCompare() {
  const measured = useAnalysisStore((s) => s.result?.season);
  const setPaletteSeason = useAnalysisStore((s) => s.setPaletteSeason);
  const { round, preview, show, choose, start, step, total, season } = useDrapeSession();

  return (
    <details className="rounded-2xl border border-line p-4 text-sm" onToggle={(e) => e.currentTarget.open && step === 0 && start()}>
      <summary className="cursor-pointer font-medium">두 색 중 골라서 내 톤 확인하기</summary>
      <div className="mt-3 space-y-3">
        {season ? (
          <>
            <p>
              직접 고른 톤은 <strong style={{ color: SEASON_INFO[season].accent }}>{SEASON_INFO[season].label} {SEASON_INFO[season].tone}</strong>이에요.
              {measured && (measured === season ? " 측정 결과와 같아요." : ` 측정 결과(${SEASON_INFO[measured].label} ${SEASON_INFO[measured].tone})와 달라요. 측정은 조명에 흔들리니 눈으로 고른 쪽도 같이 참고하세요.`)}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPaletteSeason(season === measured ? null : season)} className={`${BUTTON} bg-fg text-white`}>
                이 톤 팔레트 보기
              </button>
              <button type="button" onClick={start} className={`${BUTTON} border border-line bg-card hover:bg-accent-soft`}>
                다시 하기
              </button>
            </div>
          </>
        ) : (
          round && (
            <>
              <p className="text-muted">
                {step + 1}/{total} · 두 색을 번갈아 발라 보고 얼굴이 더 맑아 보이는 쪽을 고르세요.{step === 0 && " 사진을 꾹 누르면 바르기 전 모습이 보여요."}
              </p>
              <div role="radiogroup" aria-label="비교할 색" className="flex gap-2">
                {round.map((opt, i) => (
                  <label key={opt.swatch.id} className="cursor-pointer">
                    <input type="radio" name="drape" className="peer sr-only" checked={preview === i} onChange={() => show(i as 0 | 1)} />
                    <span className={CHIP}>
                      <span aria-hidden="true" className="size-5 rounded-full border border-black/10" style={{ background: opt.swatch.hex }} />
                      {i === 0 ? "A" : "B"}
                    </span>
                  </label>
                ))}
              </div>
              <button type="button" onClick={choose} className={`${BUTTON} bg-accent text-white hover:opacity-90`}>
                {preview === 0 ? "A" : "B"}가 더 나아요
              </button>
            </>
          )
        )}
      </div>
    </details>
  );
}
