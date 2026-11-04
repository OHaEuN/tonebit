"use client";

import { BUTTON, TAG } from "@/components/styles";
import { harmonyNote } from "./harmony";
import { useLipFaceOff, type FaceOffSide } from "./useLipFaceOff";

interface LipFaceOffProps {
  onTry: (id: string) => void;
}

interface SideProps {
  side: FaceOffSide;
  label: string;
  onTry: (id: string) => void;
}

function Side({ side, label, onTry }: SideProps) {
  const { item, harmony, score } = side.ranked;
  return (
    <figure className="min-w-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- 기기 안에서 만든 data URL이라 next/image가 필요 없다 */}
      <img src={side.crop} alt={`${item.name}을 바른 얼굴`} className="block aspect-[4/5] w-full rounded-[12px] bg-card object-cover" />
      <figcaption className="mt-3">
        <span className={TAG}>{label}</span>
        <p className="mt-2 text-[12px] text-muted">{item.brand}</p>
        <p className="line-clamp-2 text-[15px] font-medium leading-snug">{item.shade ?? item.name}</p>
        <p className="mt-1 text-[22px] font-semibold tabular-nums">
          {score}
          <span className="ml-0.5 text-[12px] font-normal text-muted">점 · {side.rank}위</span>
        </p>
        <p className="mt-1 text-[12px] leading-snug text-muted">{harmonyNote(harmony)}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button type="button" onClick={() => onTry(item.id)} className={BUTTON.small}>
            발라 보기
          </button>
          {side.url && (
            <a href={side.url} target="_blank" rel="sponsored noopener" data-umami-event="product-click" data-umami-event-id={item.id} className={`${BUTTON.small} bg-fg text-white hover:opacity-85`}>
              구매
            </a>
          )}
        </div>
      </figcaption>
    </figure>
  );
}

/** 내 얼굴에 가장 안 어울리는 립과 가장 어울리는 립을 나란히. 점수 차이를 눈으로 확인하는 첫 화면 */
export function LipFaceOff({ onTry }: LipFaceOffProps) {
  const faceOff = useLipFaceOff();
  if (!faceOff) return null;
  return (
    <section aria-labelledby="faceoff-heading">
      <h3 id="faceoff-heading" className="text-[20px] font-semibold">
        안 어울리는 립 vs 어울리는 립
      </h3>
      <p className="mt-1 text-[13px] text-muted">인기 제품 {faceOff.total}개를 내 얼굴에 얹어 AI가 재미로 매긴 점수예요. 꼴찌와 1등을 바른 얼굴을 나란히 봐요.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:gap-5">
        <Side side={faceOff.worst} label="Worst" onTry={onTry} />
        <Side side={faceOff.best} label="Best" onTry={onTry} />
      </div>
    </section>
  );
}
