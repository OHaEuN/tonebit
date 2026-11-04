"use client";

import { BUTTON } from "@/components/styles";
import { ContenderCard } from "./ContenderCard";
import { useLipWorldCup } from "./useLipWorldCup";
import { WorldCupResult } from "./WorldCupResult";

interface LipWorldCupProps {
  onTry: (id: string) => void;
}

/** 립 월드컵: 내 얼굴에 바른 두 립 중 나은 쪽을 고르는 토너먼트. 판정은 이용자의 눈이 한다 */
export function LipWorldCup({ onTry }: LipWorldCupProps) {
  const cup = useLipWorldCup();
  if (!cup.ready) return <p className="text-[13px] text-muted">얼굴 사진이 있어야 월드컵을 할 수 있어요. 측정을 다시 해 주세요.</p>;

  if (cup.outcome) return <WorldCupResult outcome={cup.outcome} onTry={onTry} onRestart={cup.start} />;

  if (!cup.started || !cup.match) {
    return (
      <section aria-labelledby="worldcup-heading" className="space-y-4">
        <h3 id="worldcup-heading" className="text-[20px] font-semibold">
          립 월드컵 {cup.total}강
        </h3>
        <p className="text-[15px] leading-relaxed text-muted">
          AI 순위 상위에서 서로 다른 {cup.total}색을 골라 내 얼굴에 발랐어요. 둘 중 더 나아 보이는 쪽을 {cup.total - 1}번 고르면 내 눈으로 고른 1등이 나와요. 끝나면
          AI가 고른 1등과 나란히 봐요.
        </p>
        <button type="button" onClick={cup.start} className={`${BUTTON.primary} w-full`}>
          시작하기
        </button>
      </section>
    );
  }

  const [a, b] = cup.match;
  return (
    <section aria-labelledby="worldcup-heading" aria-live="polite">
      <div className="flex items-baseline justify-between">
        <h3 id="worldcup-heading" className="text-[20px] font-semibold">
          {cup.label}
        </h3>
        <span className="text-[13px] text-muted">더 나아 보이는 얼굴을 누르세요</span>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(cup.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-fg transition-[width]" style={{ width: `${cup.progress * 100}%` }} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:gap-5">
        <ContenderCard key={a.ranked.item.id} contender={a} tag="A" onPick={() => cup.choose(a.ranked.item.id)} />
        <ContenderCard key={b.ranked.item.id} contender={b} tag="B" onPick={() => cup.choose(b.ranked.item.id)} />
      </div>
    </section>
  );
}
