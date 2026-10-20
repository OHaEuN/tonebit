import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { SiteHeader } from "@/components/SiteHeader";
import { BUTTON, TAG } from "@/components/styles";
import { getProducts } from "@/features/recommend/getProducts";
import { PaletteBand } from "@/features/recommend/PaletteBand";
import { parseTone, SEASON_INFO, sortSwatches, TONE_INFO, TONE_SLUGS, toneLabel } from "@/features/recommend/palettes";
import { resultPath } from "@/features/share/resultUrl";
import { HeroSwipes } from "@/features/swatch/HeroSwipes";

const STEPS = [
  { title: "카메라를 켜거나 사진을 올려요", body: "자연광 아래 정면이 가장 정확해요. 조명이 치우치면 측정 전에 알려 줘요." },
  { title: "볼과 이마의 색을 읽어요", body: "노란기와 붉은기, 밝기, 채도를 재서 웜·쿨과 12가지 시즌 중 가능성이 높은 톤을 골라요. 왜 그렇게 봤는지도 보여 줘요." },
  { title: "입술과 볼에 발라 봐요", body: "내 피부와 입술에 어울리는 순서로 립을 줄 세우고, 색을 바꿔 가며 실시간으로 얹어 봐요." },
];

/** 결과 미리보기에 쓰는 예시 톤. 실제 팔레트·제품 데이터를 그대로 보여 준다 */
const EXAMPLE = { season: "summer", subtype: "light" } as const;

const WRAP = "mx-auto w-full max-w-6xl px-4 md:px-8";

export default function LandingPage() {
  const exampleLips = getProducts(EXAMPLE.season, "lip").slice(0, 3);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 pb-16">
        <section className="bg-card">
          <div className={`${WRAP} grid items-center gap-8 pb-12 pt-8 md:grid-cols-[1.15fr_0.85fr] md:gap-12 md:py-20`}>
            <div className="order-2 md:order-1">
              <span className={TAG}>Free · No sign-up</span>
              <h1 className="mt-4 break-keep text-[38px] font-semibold leading-[1.08] md:text-[46px] xl:text-[56px]">
                내 피부톤에 맞는 립,
                <br />
                얼굴에 먼저 발라 보세요
              </h1>
              <p className="mt-5 max-w-md break-keep text-[15px] leading-relaxed text-muted md:text-[17px]">
                셀카 한 장으로 웜·쿨과 12가지 시즌 톤을 가늠하고, 어울리는 립과 블러셔를 내 얼굴에 실시간으로 발라 봐요.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Link href="/try" className={BUTTON.primary}>
                  지금 해보기
                </Link>
                <Link href="#tones" className={BUTTON.text}>
                  12톤 팔레트 보기
                </Link>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <HeroSwipes />
            </div>
          </div>
        </section>

        <section id="tones" aria-labelledby="tones-heading" className={`${WRAP} scroll-mt-4 pt-16 md:pt-24`}>
          <div className="flex items-end justify-between gap-4">
            <h2 id="tones-heading" className="text-[26px] font-semibold md:text-[34px]">
              12가지 톤 팔레트
            </h2>
            <Link href="/try" className={BUTTON.text}>
              내 톤 찾기
            </Link>
          </div>
          <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
            {TONE_SLUGS.map((slug) => {
              const tone = parseTone(slug)!;
              const lips = sortSwatches(SEASON_INFO[tone.season].lips, tone.subtype).slice(0, 4);
              return (
                <li key={slug}>
                  <Link href={resultPath(slug)} className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fg">
                    <div className="flex aspect-[4/3] items-center justify-center rounded-[12px] bg-card transition-colors group-hover:bg-[#f4f2ec]">
                      <PaletteBand swatches={lips} size={40} />
                    </div>
                    <p className="mt-3 text-[15px] font-semibold tracking-tight">{toneLabel(tone.season, tone.subtype)}</p>
                    <p className="mt-0.5 truncate text-[13px] text-muted">{TONE_INFO[slug].best.slice(0, 3).join(" · ")}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="example" className={`${WRAP} mt-20 grid gap-10 md:mt-28 md:grid-cols-[1fr_1.1fr] md:gap-16`}>
          <div>
            <h2 id="example" className="text-[26px] font-semibold leading-snug md:text-[34px]">
              결과는 이렇게 나와요
            </h2>
            <ul className="mt-6 space-y-4 text-[15px] leading-relaxed">
              <li>
                <span className="font-semibold">가능성까지 같이.</span> <span className="text-muted">한 시즌으로 단정하지 않고 다음 후보와 그렇게 본 이유를 함께 보여 줘요.</span>
              </li>
              <li>
                <span className="font-semibold">내 얼굴 기준 순위.</span> <span className="text-muted">피부와 입술 색에 비춰 실제 제품을 어울리는 순서로 줄 세워요.</span>
              </li>
              <li>
                <span className="font-semibold">내가 가진 립도.</span> <span className="text-muted">흰 종이에 발라 찍으면 색을 재서 순위에 넣고, 더 어울리는 제품을 알려 줘요.</span>
              </li>
            </ul>
          </div>

          <figure className="rounded-[12px] bg-card p-6 md:p-8" aria-label={`예시 결과: ${toneLabel(EXAMPLE.season, EXAMPLE.subtype)}`}>
            <figcaption className="flex items-center gap-2">
              <span className="text-[28px] font-semibold tracking-tight">{toneLabel(EXAMPLE.season, EXAMPLE.subtype)}</span>
              <span className={TAG}>Example</span>
            </figcaption>
            <PaletteBand swatches={sortSwatches(SEASON_INFO[EXAMPLE.season].lips, EXAMPLE.subtype)} size={40} className="mt-4" />
            <ol className="mt-6 divide-y divide-line border-y border-line">
              {exampleLips.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3.5 py-3">
                  <span className="w-5 font-mono text-[12px] text-muted">0{i + 1}</span>
                  <span aria-hidden="true" className="size-8 rounded-full" style={{ background: p.hex }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] text-muted">{p.brand}</span>
                    <span className="block truncate text-[15px] font-medium">
                      {p.name} {p.shade}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </figure>
        </section>

        <section aria-labelledby="how" className={`${WRAP} mt-20 md:mt-28`}>
          <h2 id="how" className="border-t border-fg pt-8 text-[26px] font-semibold md:text-[34px]">
            이렇게 진행돼요
          </h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="font-mono text-[13px] font-medium">0{i + 1}</span>
                <p className="mt-3 text-[17px] font-semibold tracking-tight">{step.title}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="privacy" className={`${WRAP} mt-20 md:mt-28`}>
          <div className="grid gap-4 rounded-[12px] bg-announce p-6 md:grid-cols-[1fr_1.1fr] md:gap-16 md:p-10">
            <h2 id="privacy" className="text-[24px] font-semibold leading-snug md:text-[30px]">
              사진은 기기 밖으로 나가지 않아요
            </h2>
            <p className="text-[15px] leading-relaxed">
              얼굴 인식과 색 분석은 전부 브라우저 안에서 끝나요. 서버로 보내는 이미지가 없고, 외부 서버 연결 자체를 브라우저 보안 정책으로 막아 두었어요. 공유 카드에도
              얼굴은 들어가지 않아요. 개발자 도구의 네트워크 탭을 열어 두고 써 보면 직접 확인할 수 있어요.
            </p>
          </div>
        </section>

        <div className={`${WRAP} mt-20 flex flex-col items-start gap-6 md:mt-28 md:flex-row md:items-center md:justify-between`}>
          <p className="text-[24px] font-semibold tracking-tight md:text-[30px]">내 톤에 맞는 립, 얼굴에 먼저 발라 보세요</p>
          <Link href="/try" className={BUTTON.primary}>
            테스트 시작하기
          </Link>
        </div>

        <div className={`${WRAP} mt-12`}>
          <div className="max-w-2xl">
            <Disclaimer />
          </div>
        </div>
      </main>
    </>
  );
}
