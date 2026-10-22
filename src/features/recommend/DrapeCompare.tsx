"use client";

import { Disclosure } from "@/components/Disclosure";
import { BUTTON, CHOICE_CHIP } from "@/components/styles";
import { SwatchSmear } from "@/features/swatch/SwatchSmear";
import { seedOf } from "@/features/swatch/smear";
import { useAnalysisStore } from "@/stores/analysisStore";
import { SEASON_INFO } from "./palettes";
import { useDrapeSession } from "./useDrapeSession";

const UNDECIDED_NOTE = {
  undertone: "웜·쿨은 눈으로 봐도 차이가 크지 않아서 측정 결과를 따랐어요.",
  depth: "밝은 색·진한 색은 눈으로 봐도 차이가 크지 않아서 측정 결과를 따랐어요.",
} as const;

/** 진행 점 색: 고른 라운드는 진하게, 지금 라운드는 옅게, 남은 라운드는 선 색 */
function dotColor(i: number, step: number, done: boolean): string {
  if (i < step) return "bg-fg";
  if (i === step && !done) return "bg-fg/35";
  return "bg-line";
}

/**
 * 두 색 중 골라서 내 톤 확인하기(셀프 드레이핑). 측정이 조명에 흔들려도 내 눈으로 고른 결과는 흔들리지 않는다
 */
export function DrapeCompare() {
  const setPaletteSeason = useAnalysisStore((s) => s.setPaletteSeason);
  const { round, preview, show, choose, start, step, total, result, measured } = useDrapeSession();
  const label = (s: keyof typeof SEASON_INFO) => `${SEASON_INFO[s].label} ${SEASON_INFO[s].tone}`;

  return (
    <Disclosure title="두 색 중 골라서 내 톤 확인하기" hint="여섯 번 고르면 내 눈으로 고른 톤이 나와요" onToggle={(e) => e.currentTarget.open && step === 0 && start()}>
      <div className="space-y-4">
        <ol aria-label={`${total}번 중 ${Math.min(step + 1, total)}번째`} className="flex gap-1.5">
          {Array.from({ length: total }, (_, i) => (
            <li key={i} className={`h-1 flex-1 rounded-full ${dotColor(i, step, Boolean(result))}`} />
          ))}
        </ol>
        {result ? (
          <>
            <p className="text-[15px] leading-relaxed">
              직접 고른 톤은 <strong className="font-semibold">{label(result.season)}</strong>이에요.
              {result.season === measured ? " 측정 결과와 같아요." : ` 측정 결과(${label(measured)})와 달라요. 측정은 조명에 흔들리니 눈으로 고른 쪽도 같이 참고하세요.`}
            </p>
            {result.undecided.map((axis) => (
              <p key={axis} className="text-[13px] text-muted">
                {UNDECIDED_NOTE[axis]}
              </p>
            ))}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPaletteSeason(result.season === measured ? null : result.season)} className={BUTTON.small}>
                이 톤 팔레트 보기
              </button>
              <button type="button" onClick={start} className={BUTTON.small}>
                다시 하기
              </button>
            </div>
          </>
        ) : (
          round && (
            <>
              <p className="text-muted">
                두 색을 번갈아 발라 보고 얼굴이 더 맑아 보이는 쪽을 고르세요.{step === 0 && " 사진의 전후 버튼으로 원래 얼굴과도 비교할 수 있어요."}
              </p>
              <div role="radiogroup" aria-label="비교할 색" className="flex gap-2">
                {round.map((opt, i) => (
                  <label key={opt.swatch.id} className="cursor-pointer">
                    <input type="radio" name="drape" className="peer sr-only" checked={preview === i} onChange={() => show(i as 0 | 1)} />
                    <span className={`${CHOICE_CHIP} py-2 pl-2 pr-4 text-sm font-semibold`}>
                      <SwatchSmear color={opt.swatch.hex} width={28} height={28} seed={seedOf(opt.swatch.id)} />
                      {i === 0 ? "A" : "B"}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => choose()} className={BUTTON.primary}>
                  {preview === 0 ? "A" : "B"}가 더 나아요
                </button>
                <button type="button" onClick={() => choose(true)} className={BUTTON.secondary}>
                  비슷해요
                </button>
              </div>
            </>
          )
        )}
      </div>
    </Disclosure>
  );
}
