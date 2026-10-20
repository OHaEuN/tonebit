"use client";

import { harmonyNote } from "./harmony";
import { useLipRanking } from "./useLipRanking";

interface HarmonyPicksProps {
  /** 이 립을 골라 발라 보기 탭으로 간다 */
  onTry: (id: string) => void;
}

const TOP = 3;

/** 실제 제품 중 내 피부·입술에 어울리는 립 상위 3개와, 이용자가 잰 자기 제품의 순위 */
export function HarmonyPicks({ onTry }: HarmonyPicksProps) {
  const ranking = useLipRanking();
  if (!ranking) return null;
  const { ranked } = ranking;
  const products = ranked.filter((r) => r.item.kind === "product");
  const mine = ranked.map((r, i) => ({ ...r, rank: i + 1 })).filter((r) => r.item.kind === "mine");
  const best = products[0];

  return (
    <section aria-labelledby="harmony-heading" className="space-y-3 rounded-2xl border border-line p-4 text-sm">
      <div>
        <h3 id="harmony-heading" className="font-medium">
          내 얼굴 기준 어울리는 립
        </h3>
        <p className="text-xs text-muted">피부·입술과의 밝기·색 차이(화장품 연구 기준) 60%와 내 톤일 가능성 40%를 합친 점수예요.</p>
      </div>
      <ol className="space-y-2">
        {products.slice(0, TOP).map(({ item, harmony, score }) => (
          <li key={item.id} className="flex items-center gap-3">
            <span aria-hidden="true" className="size-9 shrink-0 rounded-full border border-black/10" style={{ background: item.hex }} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{item.name}</p>
              <p className="text-xs text-muted">
                {score}점 · {harmonyNote(harmony)}
              </p>
            </div>
            <button type="button" onClick={() => onTry(item.id)} className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs hover:bg-accent-soft">
              발라 보기
            </button>
          </li>
        ))}
      </ol>
      {mine.length > 0 && best && (
        <div className="space-y-1.5 border-t border-line pt-3">
          <p className="text-xs font-medium">내가 잰 제품</p>
          {mine.map(({ item, score, rank }) => (
            <p key={item.id} className="text-xs">
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
