import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Disclaimer } from "@/components/Disclaimer";
import { PrivacyNote } from "@/components/PrivacyNote";
import { getProducts } from "@/features/recommend/getProducts";
import { parseTone, SEASON_INFO, SEASONS, sortSwatches, TONE_INFO, TONE_SLUGS, toneLabel } from "@/features/recommend/palettes";
import { ProductCard } from "@/features/recommend/ProductCard";
import { ShareButtons } from "@/features/share/ShareButtons";

/** URL 파라미터를 읽는 라우트. 전부 빌드 시 정적 생성되므로 실제 내비게이션은 즉시 뜬다 */
export const instant = false;

export function generateStaticParams() {
  return [...TONE_SLUGS, ...SEASONS].map((tone) => ({ tone }));
}

export async function generateMetadata({ params }: PageProps<"/r/[tone]">): Promise<Metadata> {
  const parsed = parseTone((await params).tone);
  if (!parsed) return {};
  return { title: toneLabel(parsed.season, parsed.subtype), description: TONE_INFO[parsed.tone].summary };
}

const LINK = "inline-block rounded-full bg-accent px-5 py-3 font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

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
    <main className="mx-auto w-full max-w-xl flex-1 space-y-8 px-4 py-8">
      <section className="space-y-3">
        <p className="text-sm text-muted">톤픽 · 재미로 보는 컬러 테스트 결과</p>
        <h1 className="text-4xl font-bold" style={{ color: seasonInfo.accent }}>
          {title}
        </h1>
        <p className="text-lg">{seasonInfo.tagline}</p>
        <p className="text-muted">{info.summary}</p>
      </section>

      <section aria-labelledby="traits" className="space-y-3 rounded-3xl border border-line bg-card p-5">
        <h2 id="traits" className="text-lg font-bold">
          이런 특징이 있어요
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {info.traits.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <div className="grid gap-3 pt-2 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold">잘 어울리는 색</p>
            <p className="text-sm text-muted">{info.best.join(", ")}</p>
          </div>
          <div>
            <p className="text-sm font-semibold">피하면 좋은 색</p>
            <p className="text-sm text-muted">{info.avoid.join(", ")}</p>
          </div>
        </div>
        <p className="rounded-2xl bg-accent-soft p-3 text-sm">{info.tip}</p>
      </section>

      <section aria-labelledby="palette" className="space-y-3">
        <h2 id="palette" className="text-xl font-bold">
          추천 팔레트
        </h2>
        <ul className="grid grid-cols-3 gap-3">
          {lips.map((s) => (
            <li key={s.id} className="flex flex-col items-center gap-1 text-sm">
              <span aria-hidden="true" className="size-14 rounded-full border border-black/10" style={{ background: s.hex }} />
              {s.name}
            </li>
          ))}
        </ul>
        <ul className="flex flex-wrap gap-3">
          {blushes.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-sm">
              <span aria-hidden="true" className="size-6 rounded-full border border-black/10" style={{ background: s.hex }} />
              {s.name}
            </li>
          ))}
        </ul>
      </section>

      <ShareButtons tone={tone} title={title} />

      <section aria-labelledby="products" className="space-y-3">
        <h2 id="products" className="text-xl font-bold">
          이 톤에 많이 찾는 제품
        </h2>
        <p className="text-sm text-muted">체험 페이지에서 이 제품들의 색을 입술과 볼에 바로 얹어 볼 수 있어요.</p>
        <h3 className="text-sm font-semibold">립</h3>
        <ul className="space-y-2">
          {lipProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </ul>
        <h3 className="pt-2 text-sm font-semibold">블러셔</h3>
        <ul className="space-y-2">
          {blushProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </ul>
        <p className="text-xs text-muted">
          색상 칩은 공식 색상명 기준 근사치라 실제 발색과 다를 수 있어요. 이 페이지의 제품 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른
          일정액의 수수료를 제공받습니다.
        </p>
      </section>

      <section className="space-y-3 rounded-3xl bg-accent-soft p-5">
        <p className="font-semibold">나도 해볼래요</p>
        <p className="text-sm text-muted">웹캠이나 셀카로 10초면 돼요. 사진은 기기 밖으로 나가지 않아요.</p>
        <Link href="/try" className={LINK}>
          내 컬러 테스트하기
        </Link>
      </section>

      <PrivacyNote compact />
      <Disclaimer />
    </main>
  );
}
