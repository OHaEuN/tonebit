"use client";

import { useEffect } from "react";
import { BUTTON } from "@/components/styles";
import { track } from "@/features/analytics/track";
import { ContenderCard } from "@/features/recommend/ContenderCard";
import { useTasteStore } from "@/features/recommend/tasteStore";
import { useLipWorldCup } from "@/features/recommend/useLipWorldCup";
import { useAnalysisStore } from "@/stores/analysisStore";
import { StepFrame } from "./StepFrame";
import { useToneLabel } from "./useToneLabel";

/** 토너먼트 인원. 8강이면 일곱 번 고른다 */
export const PICK_SIZE = 8;

/**
 * 4단계 둘 중 고르기. 내 얼굴에 바른 두 립 중 나은 쪽을 일곱 번 고르면 선택이 가중치에 배워진다.
 * 판정 주체가 이용자라 측정 정확도와 무관한 유일한 입력이다
 */
export function PickStep() {
  const tone = useToneLabel();
  const setStep = useAnalysisStore((s) => s.setStep);
  const addPick = useTasteStore((s) => s.addPick);
  const setChampion = useTasteStore((s) => s.setChampion);
  const clearPicks = useTasteStore((s) => s.clearPicks);
  const cup = useLipWorldCup({ size: PICK_SIZE, onChoose: (winner, loser) => addPick({ winner: winner.harmony.axes, loser: loser.harmony.axes }) });
  const { ready, started, start, outcome } = cup;

  useEffect(() => {
    if (ready && !started) {
      clearPicks();
      start();
    }
  }, [ready, started, start, clearPicks]);

  useEffect(() => {
    if (!outcome) return;
    setChampion(outcome.mine.ranked.item.id);
    setStep("match");
  }, [outcome, setChampion, setStep]);

  const skip = () => {
    track({ name: "pick-skip" });
    clearPicks();
    setStep("match");
  };

  if (!ready) {
    return (
      <StepFrame context={tone} index={4} title="얼굴 사진이 없어요" body="측정을 다시 하면 둘 중 고르기를 할 수 있어요." onBack={() => window.history.back()} cta={{ label: "건너뛰기", onClick: skip }} />
    );
  }

  const [a, b] = cup.match ?? [];
  return (
    <StepFrame
      context={tone}
      index={4}
      title="둘 중 더 마음에 드는 쪽을 골라 주세요"
      body={`내 얼굴에 바른 모습이에요. ${PICK_SIZE - 1}번 고르면 내 취향이 점수에 들어가요.`}
      onBack={() => window.history.back()}
      aside={
        <button type="button" onClick={skip} className={BUTTON.text}>
          건너뛰기
        </button>
      }
    >
      <div aria-live="polite">
        <div className="flex items-baseline justify-between text-[13px] text-muted">
          <span>{cup.label}</span>
          <span>더 나아 보이는 얼굴을 누르세요</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(cup.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-fg transition-[width]" style={{ width: `${cup.progress * 100}%` }} />
        </div>
        {a && b && (
          <div className="mt-4 grid grid-cols-2 gap-3 md:gap-5">
            <ContenderCard key={a.ranked.item.id} contender={a} tag="A" onPick={() => cup.choose(a.ranked.item.id)} />
            <ContenderCard key={b.ranked.item.id} contender={b} tag="B" onPick={() => cup.choose(b.ranked.item.id)} />
          </div>
        )}
      </div>
    </StepFrame>
  );
}
