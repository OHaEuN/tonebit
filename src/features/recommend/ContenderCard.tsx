import type { ReactNode } from "react";
import { TAG } from "@/components/styles";
import type { Contender } from "./useLipWorldCup";

interface ContenderCardProps {
  contender: Contender;
  tag?: string;
  /** 사진 전체를 누르는 행동. 있으면 그림이 버튼이 된다 */
  onPick?: () => void;
  children?: ReactNode;
}

/** 립을 바른 얼굴 한 장과 제품 이름. 월드컵 대결과 결과 화면이 같이 쓴다 */
export function ContenderCard({ contender, tag, onPick, children }: ContenderCardProps) {
  const { item } = contender.ranked;
  const alt = `${item.name}을 바른 얼굴`;
  /* eslint-disable-next-line @next/next/no-img-element -- 기기 안에서 만든 data URL이라 next/image가 필요 없다 */
  const image = <img src={contender.crop} alt={onPick ? "" : alt} className="block aspect-[4/5] w-full rounded-[12px] bg-card object-cover" />;
  return (
    <figure className="min-w-0">
      {onPick ? (
        <button
          type="button"
          onClick={onPick}
          aria-label={`${alt} 고르기`}
          className="block w-full rounded-[12px] transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fg"
        >
          {image}
        </button>
      ) : (
        image
      )}
      <figcaption className="mt-3">
        {tag && <span className={TAG}>{tag}</span>}
        <p className={`${tag ? "mt-2" : ""} text-[12px] text-muted`}>{item.brand}</p>
        <p className="line-clamp-2 text-[15px] font-medium leading-snug">{item.shade ?? item.name}</p>
        {children}
      </figcaption>
    </figure>
  );
}
