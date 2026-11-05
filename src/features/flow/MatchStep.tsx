"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Disclosure } from "@/components/Disclosure";
import { BUTTON, TAG } from "@/components/styles";
import { renderFaceCrop } from "@/features/lipTryOn/faceCrop";
import { bestTag, productById } from "@/features/recommend/getProducts";
import { harmonyNote } from "@/features/recommend/harmony";
import { HarmonyBars } from "@/features/recommend/HarmonyBars";
import { LipFaceOff } from "@/features/recommend/LipFaceOff";
import { useTasteStore } from "@/features/recommend/tasteStore";
import { diversifyByLine, useLipRanking } from "@/features/recommend/useLipRanking";
import { resultPath } from "@/features/share/resultUrl";
import { SwatchSmear } from "@/features/swatch/SwatchSmear";
import { seedOf, smearFinish } from "@/features/swatch/smear";
import { useAnalysisStore } from "@/stores/analysisStore";
import { StepFrame } from "./StepFrame";

const FIRST = 5;
const MORE = 5;
/** 행마다 얼굴 그림의 가로 픽셀. 폰에서 88css px × 3배 */
const CROP_WIDTH = 300;
/** 유행 점수가 이 이상이면 "요즘 인기" 꼬리표 */
const TREND_TAG_MIN = 0.6;

/** 5단계 내 립. 연구 기준 점수에 취향과 선택을 더한 순위를 내 얼굴에 바른 그림과 함께 */
export function MatchStep() {
  const result = useAnalysisStore((s) => s.result)!;
  const snapshot = useAnalysisStore((s) => s.snapshot);
  const selectLip = useAnalysisStore((s) => s.selectLip);
  const setStep = useAnalysisStore((s) => s.setStep);
  const picks = useTasteStore((s) => s.picks.length);
  const champion = useTasteStore((s) => s.champion);
  const ranking = useLipRanking();
  const [shown, setShown] = useState(FIRST);

  const products = useMemo(() => (ranking ? diversifyByLine(ranking.ranked.filter((r) => r.item.kind === "product"), champion) : []), [ranking, champion]);
  const mine = useMemo(() => (ranking ? ranking.ranked.map((r, i) => ({ ...r, rank: i + 1 })).filter((r) => r.item.kind === "mine") : []), [ranking]);
  const visible = products.slice(0, shown);
  const crops = useMemo(() => {
    const map = new Map<string, string>();
    if (!snapshot) return map;
    for (const { item } of visible) map.set(item.id, renderFaceCrop(snapshot, item.hex, item.finish, CROP_WIDTH).toDataURL("image/jpeg", 0.85));
    return map;
  }, [snapshot, visible]);

  const tryOn = (id: string) => {
    selectLip(id);
    setStep("tryon");
  };
  const best = products[0];
  if (!best) return null;

  return (
    <StepFrame
      index={5}
      title="내 얼굴에 어울리는 립"
      body={picks > 0 ? "밝기 대비·색 방향·혈색·선명도·색 조화·톤 팔레트·유행에 방금 고른 취향을 더한 순위예요." : "밝기 대비·색 방향·혈색·선명도·색 조화·톤 팔레트·유행으로 매긴 순위예요."}
      onBack={() => window.history.back()}
      cta={{ label: "1등 립 얼굴에 발라 보기", onClick: () => tryOn(best.item.id) }}
      aside={
        <>
          {process.env.NEXT_PUBLIC_ADVISOR_ENABLED && (
            <button type="button" onClick={() => setStep("ask")} className={BUTTON.text}>
              AI에게 더 물어보기
            </button>
          )}
          <Link href={resultPath(result.tone)} className={BUTTON.text}>
            결과 카드와 추천 보기
          </Link>
        </>
      }
    >
      <ol aria-label="내 얼굴 기준 립 순위" className="divide-y divide-line border-y border-line">
        {visible.map(({ item, harmony, score }, i) => {
          const product = productById(item.id);
          const crop = crops.get(item.id);
          return (
            <li key={item.id} className="flex gap-3.5 py-4">
              {crop ? (
                // eslint-disable-next-line @next/next/no-img-element -- 기기 안에서 만든 data URL이라 next/image가 필요 없다
                <img src={crop} alt={`${item.name}을 바른 얼굴`} className="aspect-[4/5] w-[88px] shrink-0 rounded-[8px] bg-card object-cover md:w-[104px]" />
              ) : (
                <SwatchSmear color={item.hex} width={56} height={56} finish={smearFinish(item.finish)} seed={seedOf(item.id)} className="shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                  <span className="font-mono">{String(i + 1).padStart(2, "0")}</span>
                  {item.brand}
                  {i === 0 && <span className={TAG}>Best</span>}
                  {item.id === champion && <span className={TAG}>내 1등</span>}
                  {bestTag(product?.best) && <span className={TAG}>{bestTag(product?.best)}</span>}
                  {(item.trend ?? 0) >= TREND_TAG_MIN && <span className={TAG}>요즘 인기</span>}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[15px] font-medium leading-snug">{item.shade ?? item.name}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-muted">{harmonyNote(harmony)}</p>
                <details className="mt-1.5">
                  <summary className="cursor-pointer list-none text-[12px] text-muted underline underline-offset-4 [&::-webkit-details-marker]:hidden">항목별 점수</summary>
                  <HarmonyBars ranked={{ harmony }} className="mt-1.5" />
                </details>
                <div className="mt-2.5 flex gap-1.5">
                  <button type="button" onClick={() => tryOn(item.id)} className={BUTTON.small}>
                    발라 보기
                  </button>
                  {product && (
                    <a href={product.url} target="_blank" rel="sponsored noopener" data-umami-event="product-click" data-umami-event-id={item.id} className={`${BUTTON.small} bg-fg text-white hover:opacity-85`}>
                      구매
                    </a>
                  )}
                </div>
              </div>
              <p className="shrink-0 text-[20px] font-semibold tabular-nums">
                {score}
                <span className="ml-0.5 text-[12px] font-normal text-muted">점</span>
              </p>
            </li>
          );
        })}
      </ol>
      {shown < products.length && (
        <button type="button" onClick={() => setShown((n) => n + MORE)} className={`${BUTTON.text} mt-3`}>
          {Math.min(products.length - shown, MORE)}개 더 보기
        </button>
      )}
      {mine.length > 0 && (
        <div className="mt-5 space-y-1.5">
          <p className="text-[13px] font-semibold">내가 잰 제품</p>
          {mine.map(({ item, score, rank }) => (
            <p key={item.id} className="text-[13px]">
              <span aria-hidden="true" className="mr-1.5 inline-block size-3 rounded-full align-[-2px]" style={{ background: item.hex }} />
              {item.name} {score}점, 전체 {ranking!.ranked.length}개 중 {rank}위.
              {score < best.score && <span className="text-muted"> 더 잘 어울리는 제품: {best.item.name} {best.score}점</span>}
            </p>
          ))}
        </div>
      )}
      <div className="mt-6 border-b border-line">
        <Disclosure title="가장 안 어울리는 립과 나란히 보기" hint="꼴찌와 1등을 바른 얼굴을 같이 봐요">
          <LipFaceOff onTry={tryOn} />
        </Disclosure>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted">제품 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>
    </StepFrame>
  );
}
