import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Disclaimer } from "@/components/Disclaimer";
import { PrivacyNote } from "@/components/PrivacyNote";
import { SiteHeader } from "@/components/SiteHeader";
import { BUTTON, TAG } from "@/components/styles";
import { getProducts } from "@/features/recommend/getProducts";
import {
  parseTone,
  SEASON_INFO,
  SEASONS,
  sortSwatches,
  TONE_INFO,
  TONE_SLUGS,
  toneLabel,
} from "@/features/recommend/palettes";
import { PaletteBand } from "@/features/recommend/PaletteBand";
import { ProductCard } from "@/features/recommend/ProductCard";
import { resultPath } from "@/features/share/resultUrl";
import { ShareButtons } from "@/features/share/ShareButtons";
import { SwatchSmear } from "@/features/swatch/SwatchSmear";
import { seedOf } from "@/features/swatch/smear";

/** URL 파라미터를 읽는 라우트. 전부 빌드 시 정적 생성되므로 실제 내비게이션은 즉시 뜬다 */
export const instant = false;

export function generateStaticParams() {
  return [...TONE_SLUGS, ...SEASONS].map((tone) => ({ tone }));
}

export async function generateMetadata({
  params,
}: PageProps<"/r/[tone]">): Promise<Metadata> {
  const parsed = parseTone((await params).tone);
  if (!parsed) return {};
  return {
    title: toneLabel(parsed.season, parsed.subtype),
    description: TONE_INFO[parsed.tone].summary,
    // 시즌만 있는 옛 링크(/r/spring)도 트루 타입 주소 하나로 모은다
    alternates: { canonical: resultPath(parsed.tone) },
  };
}

/** "피부: 밝은 아이보리…"처럼 적힌 특징을 항목과 설명으로 나눈다 */
function splitTrait(trait: string): [string, string] {
  const i = trait.indexOf(":");
  return i < 0
    ? ["", trait]
    : [trait.slice(0, i).trim(), trait.slice(i + 1).trim()];
}

export default async function ResultPage({ params }: PageProps<"/r/[tone]">) {
  const parsed = parseTone((await params).tone);
  if (!parsed) notFound();
  const { season, subtype, tone } = parsed;
  const seasonInfo = SEASON_INFO[season];
  const info = TONE_INFO[tone];
  const title = toneLabel(season, subtype);
  const lips = sortSwatches(seasonInfo.lips, subtype);
  const blushes = sortSwatches(seasonInfo.blushes, subtype);
  const lipProducts = getProducts(season, "lip");
  const blushProducts = getProducts(season, "blush");

  return (
    <>
      <SiteHeader
        action={
          <Link href="/try" className={BUTTON.small}>
            나도 해보기
          </Link>
        }
      />
      <main className="flex-1 pb-16">
        <section className="bg-card">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 pb-10 pt-8 md:grid-cols-[1fr_1fr] md:gap-12 md:px-8 md:py-16">
            <div className="order-2 md:order-1">
              <span className={TAG}>ToneBit result</span>
              <h1 className="mt-4 text-[42px] font-semibold leading-[1.08] md:text-[60px]">
                {title}
              </h1>
              <p className="mt-3 text-[17px]">{seasonInfo.tagline}</p>
              <PaletteBand swatches={lips} size={48} className="mt-6" />
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted">
                {info.summary}
              </p>
              <div className="mt-7">
                <ShareButtons tone={tone} title={title} />
              </div>
              <p className="mt-4 text-[13px] text-muted">
                재미로 보는 테스트라 조명과 카메라에 따라 달라질 수 있어요.
              </p>
            </div>
            <div className="order-1 mx-auto w-full max-w-[520px] md:order-2">
              <SwatchSmear
                color={lips[0].hex}
                shape="swipe"
                width={600}
                height={250}
                seed={seedOf(tone)}
                fluid
                maxDpr={1.5}
                label={`${lips[0].name} 발색`}
              />
              <div className="-mt-[10%] -scale-x-100">
                <SwatchSmear
                  color={lips[2].hex}
                  shape="swipe"
                  finish="gloss"
                  width={600}
                  height={250}
                  seed={seedOf(tone) + 1}
                  fluid
                  maxDpr={1.5}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
          <section
            aria-labelledby="traits"
            className="grid gap-6 pt-14 md:grid-cols-[1fr_1.4fr] md:gap-16 md:pt-20"
          >
            <h2
              id="traits"
              className="text-[26px] font-semibold md:text-[34px]"
            >
              이런 특징이 있어요
            </h2>
            <div>
              <dl className="divide-y divide-line border-y border-line text-[15px]">
                {info.traits.map((t) => {
                  const [term, desc] = splitTrait(t);
                  return (
                    <div
                      key={t}
                      className="grid grid-cols-[5.5rem_1fr] gap-3 py-3.5"
                    >
                      <dt className="text-muted">{term}</dt>
                      <dd>{desc}</dd>
                    </div>
                  );
                })}
                <div className="grid grid-cols-[5.5rem_1fr] gap-3 py-3.5">
                  <dt className="text-muted">잘 어울려요</dt>
                  <dd>{info.best.join(", ")}</dd>
                </div>
                <div className="grid grid-cols-[5.5rem_1fr] gap-3 py-3.5">
                  <dt className="text-muted">피해 보세요</dt>
                  <dd>{info.avoid.join(", ")}</dd>
                </div>
              </dl>
              <p className="mt-5 rounded-[12px] bg-announce p-4 text-[15px] leading-relaxed">
                {info.tip}
              </p>
            </div>
          </section>

          <section
            aria-labelledby="palette"
            className="mt-20 border-t border-fg pt-8"
          >
            <h2
              id="palette"
              className="text-[26px] font-semibold md:text-[34px]"
            >
              추천 팔레트
            </h2>
            <ul className="mt-6 grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-8">
              {lips.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col items-center gap-2 text-center text-[13px]"
                >
                  <SwatchSmear
                    color={s.hex}
                    width={60}
                    height={60}
                    seed={seedOf(s.id)}
                  />
                  {s.name}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[13px] text-muted">블러셔</p>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
              {blushes.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-[13px]">
                  <SwatchSmear
                    color={s.hex}
                    width={28}
                    height={28}
                    seed={seedOf(s.id)}
                  />
                  {s.name}
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="products"
            className="mt-20 border-t border-fg pt-8"
          >
            <h2
              id="products"
              className="text-[26px] font-semibold md:text-[34px]"
            >
              이 톤에 많이 찾는 제품
            </h2>
            <p className="mt-1.5 text-[13px] text-muted">
              체험 페이지에서 이 제품들의 색을 입술과 볼에 바로 얹어 볼 수
              있어요.
            </p>
            <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-16">
              <div>
                <h3 className="text-[15px] font-semibold">립</h3>
                <ul className="mt-2 divide-y divide-line border-y border-line">
                  {lipProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-[15px] font-semibold">블러셔</h3>
                <ul className="mt-2 divide-y divide-line border-y border-line">
                  {blushProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-5 text-xs leading-relaxed text-muted">
              색상 칩은 공식 색상명 기준 근사치라 실제 발색과 다를 수 있어요. 이
              페이지의 제품 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른
              일정액의 수수료를 제공받습니다.
            </p>
          </section>

          <section className="mt-20 flex flex-col items-start gap-5 rounded-[12px] bg-card p-6 md:flex-row md:items-center md:justify-between md:p-10">
            <div>
              <p className="text-[22px] font-bold tracking-tight md:text-[26px]">
                나도 해볼래요
              </p>
              <p className="mt-1 text-[15px] text-muted">
                셀카 한 장이면 돼요. 사진은 기기 밖으로 나가지 않아요.
              </p>
            </div>
            <Link href="/try" className={BUTTON.primary}>
              내 컬러 테스트하기
            </Link>
          </section>

          <div className="mt-12 max-w-2xl space-y-4">
            <PrivacyNote compact />
            <Disclaimer />
          </div>
        </div>
      </main>
    </>
  );
}
