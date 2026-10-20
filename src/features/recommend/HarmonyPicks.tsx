"use client";

import { BUTTON, TAG } from "@/components/styles";
import { SwatchSmear } from "@/features/swatch/SwatchSmear";
import { seedOf, smearFinish } from "@/features/swatch/smear";
import { harmonyNote } from "./harmony";
import { useLipRanking } from "./useLipRanking";

interface HarmonyPicksProps {
  /** 이 립을 골라 발라 보기 탭으로 간다 */
  onTry: (id: string) => void;
}

const TOP = 3;

/** 실제 제품 중 내 피부·입술에 어울리는 립 상위 3개와, 이용자가 잰 자기 제품의 순위. 실제 순위라 번호를 붙인다 */
export function HarmonyPicks({ onTry }: HarmonyPicksProps) {
  const ranking = useLipRanking();
  if (!ranking) return null;
  const { ranked } = ranking;
  const products = ranked.filter((r) => r.item.kind === "product");
  const mine = ranked.map((r, i) => ({ ...r, rank: i + 1 })).filter((r) => r.item.kind === "mine");
  const best = products[0];

  return (
    <section aria-labelledby="harmony-heading">
      <h3 id="harmony-heading" className="text-[20px] font-semibold">
        내 얼굴 기준 어울리는 립
      </h3>
      <p className="mt-1 text-[13px] text-muted">피부·입술과의 밝기·색 차이(화장품 연구 기준) 60%와 내 톤일 가능성 40%로 매긴 점수예요.</p>
      <ol className="mt-4 divide-y divide-line border-y border-line">
        {products.slice(0, TOP).map(({ item, harmony, score }, i) => (
          <li key={item.id} className="flex items-center gap-3.5 py-3.5">
            <span className="w-5 shrink-0 font-mono text-[12px] text-muted">0{i + 1}</span>
            <SwatchSmear color={item.hex} width={48} height={48} finish={smearFinish(item.finish)} seed={seedOf(item.id)} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[12px] text-muted">
                {item.brand}
                {i === 0 && <span className={TAG}>Best</span>}
              </p>
              <p className="line-clamp-2 text-[15px] font-medium leading-snug">{item.shade ?? item.name}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-muted">{harmonyNote(harmony)}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <p className="text-[17px] font-semibold tabular-nums">
                {score}
                <span className="ml-0.5 text-[12px] font-normal text-muted">점</span>
              </p>
              <button type="button" onClick={() => onTry(item.id)} className={BUTTON.small}>
                발라 보기
              </button>
            </div>
          </li>
        ))}
      </ol>
      {mine.length > 0 && best && (
        <div className="mt-4 space-y-1.5">
          <p className="text-[13px] font-semibold">내가 잰 제품</p>
          {mine.map(({ item, score, rank }) => (
            <p key={item.id} className="text-[13px]">
              <span aria-hidden="true" className="mr-1.5 inline-block size-3 rounded-full align-[-2px]" style={{ background: item.hex }} />
              {item.name} {score}점, 전체 {ranked.length}개 중 {rank}위.
              {score < best.score && <span className="text-muted"> 더 잘 어울리는 제품: {best.item.name} {best.score}점</span>}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
