import { BUTTON } from "@/components/styles";
import { ContenderCard } from "./ContenderCard";
import type { Contender, WorldCupOutcome } from "./useLipWorldCup";

interface WorldCupResultProps {
  outcome: WorldCupOutcome;
  onTry: (id: string) => void;
  onRestart: () => void;
}

function Actions({ contender, onTry }: { contender: Contender; onTry: (id: string) => void }) {
  const { item, score } = contender.ranked;
  return (
    <>
      <p className="mt-1 text-[13px] text-muted">
        AI 점수 <span className="font-semibold text-fg tabular-nums">{score}</span>점 · {contender.rank}위
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button type="button" onClick={() => onTry(item.id)} className={BUTTON.small}>
          발라 보기
        </button>
        {contender.url && (
          <a href={contender.url} target="_blank" rel="sponsored noopener" data-umami-event="product-click" data-umami-event-id={item.id} className={`${BUTTON.small} bg-fg text-white hover:opacity-85`}>
            구매
          </a>
        )}
      </div>
    </>
  );
}

/** 내가 고른 1등과 AI 1등을 나란히. 같으면 확신, 다르면 둘 다 후보 */
export function WorldCupResult({ outcome, onTry, onRestart }: WorldCupResultProps) {
  const { mine, ai, same } = outcome;
  return (
    <div>
      <h3 className="text-[20px] font-semibold">{same ? "내 눈과 AI가 같은 립을 골랐어요" : "내 눈과 AI가 다른 립을 골랐어요"}</h3>
      <p className="mt-1 text-[13px] text-muted">
        {same ? "측정과 내 눈이 같은 답이면 믿어도 좋아요." : "측정은 조명에 흔들리니 내 눈으로 고른 쪽을 더 믿어도 돼요. 둘 다 발라 보고 정하세요."}
      </p>
      <div className={`mt-4 grid gap-3 md:gap-5 ${same ? "max-w-[280px]" : "grid-cols-2"}`}>
        <ContenderCard contender={mine} tag={same ? "My pick · AI pick" : "My pick"}>
          <Actions contender={mine} onTry={onTry} />
        </ContenderCard>
        {!same && (
          <ContenderCard contender={ai} tag="AI pick">
            <Actions contender={ai} onTry={onTry} />
          </ContenderCard>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-2.5">
        <a href={mine.crop} download="tonebit-my-pick.jpg" className={BUTTON.secondary}>
          내 1등 사진 저장
        </a>
        <button type="button" onClick={onRestart} className={BUTTON.text}>
          다시 하기
        </button>
      </div>
    </div>
  );
}
