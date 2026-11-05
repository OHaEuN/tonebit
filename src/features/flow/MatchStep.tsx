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
import { activeWeights } from "@/features/recommend/harmony";
import {
  BASE_WEIGHTS,
  describePicks,
  weightChanges,
} from "@/features/recommend/preference";
import { useTasteStore } from "@/features/recommend/tasteStore";
import {
  diversifyByLine,
  useLipRanking,
} from "@/features/recommend/useLipRanking";
import { resultPath } from "@/features/share/resultUrl";
import { SwatchSmear } from "@/features/swatch/SwatchSmear";
import { seedOf, smearFinish } from "@/features/swatch/smear";
import { useAnalysisStore } from "@/stores/analysisStore";
import { StepFrame } from "./StepFrame";
import { useToneLabel } from "./useToneLabel";

const FIRST = 5;
const MORE = 5;
/** 행마다 얼굴 그림의 가로 픽셀. 폰에서 88css px × 3배 */
const CROP_WIDTH = 300;
/** 유행 점수가 이 이상이면 "요즘 인기" 꼬리표. 월간 베스트 15위 안 라인이 키워드까지 맞을 때쯤 */
const TREND_TAG_MIN = 0.8;

/** 5단계 내 립. 연구 기준 점수에 취향과 선택을 더한 순위를 내 얼굴에 바른 그림과 함께 */
export function MatchStep() {
  const tone = useToneLabel();
  const result = useAnalysisStore((s) => s.result)!;
  const snapshot = useAnalysisStore((s) => s.snapshot);
  const selectLip = useAnalysisStore((s) => s.selectLip);
  const setStep = useAnalysisStore((s) => s.setStep);
  const picks = useTasteStore((s) => s.picks);
  const weights = useTasteStore((s) => s.weights);
  const taste = useTasteStore((s) => s.taste);
  const champion = useTasteStore((s) => s.champion);
  const ranking = useLipRanking();
  const [shown, setShown] = useState(FIRST);

  const products = useMemo(
    () =>
      ranking
        ? diversifyByLine(
            ranking.ranked.filter((r) => r.item.kind === "product"),
            champion,
          )
        : [],
    [ranking, champion],
  );
  /** 전체 순위(1부터). 선택 반영 전 순위와 비교할 때 쓴다 */
  const currentRank = useMemo(
    () => new Map((ranking?.ranked ?? []).map((r, i) => [r.item.id, i + 1])),
    [ranking],
  );
  const learned =
    picks.length > 0 && ranking !== null && ranking.baseRank.size > 0;
  const phrases = useMemo(() => describePicks(picks), [picks]);
  const changes = useMemo(
    () =>
      learned ? weightChanges(activeWeights(BASE_WEIGHTS, taste), weights) : [],
    [learned, taste, weights],
  );
  const mine = useMemo(
    () =>
      ranking
        ? ranking.ranked
            .map((r, i) => ({ ...r, rank: i + 1 }))
            .filter((r) => r.item.kind === "mine")
        : [],
    [ranking],
  );
  const visible = products.slice(0, shown);
  const crops = useMemo(() => {
    const map = new Map<string, string>();
    if (!snapshot) return map;
    for (const { item } of visible)
      map.set(
        item.id,
        renderFaceCrop(snapshot, item.hex, item.finish, CROP_WIDTH).toDataURL(
          "image/jpeg",
          0.85,
        ),
      );
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
      context={tone}
      index={5}
      title="내 얼굴에 어울리는 립"
      body={
        learned
          ? "내 피부와의 진하기·웜쿨·혈색·선명함 궁합에 내 톤 팔레트, 유행, 방금 고른 취향을 더한 순위예요."
          : "내 피부와의 진하기·웜쿨·혈색·선명함 궁합에 내 톤 팔레트와 유행을 더한 순위예요."
      }
      onBack={() => window.history.back()}
      cta={{
        label: "1등 립 얼굴에 발라 보기",
        onClick: () => tryOn(best.item.id),
      }}
      aside={
        <>
          {process.env.NEXT_PUBLIC_ADVISOR_ENABLED && (
            <button
              type="button"
              onClick={() => setStep("ask")}
              className={BUTTON.text}
            >
              AI에게 더 물어보기
            </button>
          )}
          <Link href={resultPath(result.tone)} className={BUTTON.text}>
            결과 카드와 추천 보기
          </Link>
        </>
      }
    >
      {learned && (
        <div
          className="mb-5 rounded-[12px] bg-card px-4 py-3.5 text-[13px] leading-relaxed"
          aria-label="방금 고른 선택이 바꾼 것"
        >
          <p className="text-[14px] font-semibold">
            방금 고른 {picks.length}번이 바꾼 것
          </p>
          <p className="mt-1">
            {phrases.length
              ? `${phrases.join(", ")}을 골랐어요.`
              : "한쪽으로 기운 취향은 없었어요."}
            {champion &&
              currentRank.has(champion) &&
              ` 끝까지 이긴 립은 전체 ${currentRank.get(champion)}위예요.`}
          </p>
          {changes.length > 0 && (
            <ul
              className="mt-2 flex flex-wrap gap-1.5"
              aria-label="바뀐 가중치"
            >
              {changes.map((c) => (
                <li
                  key={c.key}
                  className="inline-flex h-7 items-center rounded-full border border-fg/20 px-2.5 text-[12px]"
                >
                  {c.label} {c.ratio > 1 ? "더" : "덜"} 중요하게{" "}
                  {c.ratio > 1 ? "+" : "−"}
                  {Math.round(Math.abs(c.ratio - 1) * 100)}%
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1.5 text-muted">
            행의 ▲▼는 선택을 반영하기 전 순위와의 차이예요.
          </p>
        </div>
      )}
      <ol
        aria-label="내 얼굴 기준 립 순위"
        className="divide-y divide-line border-y border-line"
      >
        {visible.map(({ item, harmony, score }, i) => {
          const product = productById(item.id);
          const crop = crops.get(item.id);
          const delta = learned
            ? (ranking!.baseRank.get(item.id) ?? 0) -
              (currentRank.get(item.id) ?? 0)
            : 0;
          return (
            <li key={item.id} className="py-4">
              <div className="flex gap-3.5">
                {crop ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 기기 안에서 만든 data URL이라 next/image가 필요 없다
                  <img
                    src={crop}
                    alt={`${item.name}을 바른 얼굴`}
                    className="aspect-[4/5] w-[88px] shrink-0 rounded-[8px] bg-card object-cover md:w-[104px]"
                  />
                ) : (
                  <SwatchSmear
                    color={item.hex}
                    width={56}
                    height={56}
                    finish={smearFinish(item.finish)}
                    seed={seedOf(item.id)}
                    className="shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                    <span className="font-mono">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {delta !== 0 && (
                      <span
                        className={`font-mono ${delta > 0 ? "text-emerald-700" : "text-muted"}`}
                        aria-label={`선택 반영 전보다 ${Math.abs(delta)}계단 ${delta > 0 ? "위" : "아래"}`}
                      >
                        {delta > 0 ? `▲${delta}` : `▼${-delta}`}
                      </span>
                    )}
                    {item.brand}
                    {i === 0 && <span className={TAG}>Best</span>}
                    {item.id === champion && (
                      <span className={TAG}>내 1등</span>
                    )}
                    {bestTag(product?.best) && (
                      <span className={TAG}>{bestTag(product?.best)}</span>
                    )}
                    {(item.trend ?? 0) >= TREND_TAG_MIN && (
                      <span className={TAG}>요즘 인기</span>
                    )}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[15px] font-medium leading-snug">
                    {item.shade ?? item.name}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-muted">
                    {harmonyNote(harmony)}
                  </p>
                  <div className="mt-2.5 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => tryOn(item.id)}
                      className={BUTTON.small}
                    >
                      발라 보기
                    </button>
                    {product && (
                      <a
                        href={product.url}
                        target="_blank"
                        rel="sponsored noopener"
                        data-umami-event="product-click"
                        data-umami-event-id={item.id}
                        className={`${BUTTON.small} bg-fg text-white hover:opacity-85`}
                      >
                        구매
                      </a>
                    )}
                  </div>
                </div>
                <p className="shrink-0 text-[20px] font-semibold tabular-nums">
                  {score}
                  <span className="ml-0.5 text-[12px] font-normal text-muted">
                    점
                  </span>
                </p>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer list-none text-[12px] text-muted underline underline-offset-4 [&::-webkit-details-marker]:hidden">
                  왜 이 점수예요?
                </summary>
                <HarmonyBars
                  ranked={{ harmony }}
                  className="mt-2.5 max-w-[360px]"
                />
              </details>
            </li>
          );
        })}
      </ol>
      {shown < products.length && (
        <button
          type="button"
          onClick={() => setShown((n) => n + MORE)}
          className={`${BUTTON.text} mt-3`}
        >
          {Math.min(products.length - shown, MORE)}개 더 보기
        </button>
      )}
      {mine.length > 0 && (
        <div className="mt-5 space-y-1.5">
          <p className="text-[13px] font-semibold">내가 잰 제품</p>
          {mine.map(({ item, score, rank }) => (
            <p key={item.id} className="text-[13px]">
              <span
                aria-hidden="true"
                className="mr-1.5 inline-block size-3 rounded-full align-[-2px]"
                style={{ background: item.hex }}
              />
              {item.name} {score}점, 전체 {ranking!.ranked.length}개 중 {rank}
              위.
              {score < best.score && (
                <span className="text-muted">
                  {" "}
                  더 잘 어울리는 제품: {best.item.name} {best.score}점
                </span>
              )}
            </p>
          ))}
        </div>
      )}
      <div className="mt-6 border-b border-line">
        <Disclosure
          title="가장 안 어울리는 립과 나란히 보기"
          hint="꼴찌와 1등을 바른 얼굴을 같이 봐요"
        >
          <LipFaceOff onTry={tryOn} />
        </Disclosure>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        제품 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를
        제공받습니다.
      </p>
    </StepFrame>
  );
}
