import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/features/ads/AdSlot";
import { Disclaimer } from "@/components/Disclaimer";
import { PrivacyNote } from "@/components/PrivacyNote";
import { getProducts } from "@/features/recommend/getProducts";
import { isSeason, SEASON_INFO, SEASONS } from "@/features/recommend/palettes";
import { ProductCard } from "@/features/recommend/ProductCard";
import { ShareButtons } from "@/features/share/ShareButtons";

/** URL 파라미터를 읽는 라우트. 네 시즌은 빌드 시 정적 생성되므로 실제 내비게이션은 즉시 뜬다 */
export const instant = false;

export function generateStaticParams() {
  return SEASONS.map((season) => ({ season }));
}

export async function generateMetadata({ params }: PageProps<"/r/[season]">): Promise<Metadata> {
  const { season } = await params;
  if (!isSeason(season)) return {};
  const info = SEASON_INFO[season];
  return { title: `${info.label} ${info.tone}`, description: `${info.tagline}. ${info.description}` };
}

export default async function ResultPage({ params }: PageProps<"/r/[season]">) {
  const { season } = await params;
  if (!isSeason(season)) notFound();
  const info = SEASON_INFO[season];
  const products = getProducts(season);
  const title = `${info.label} ${info.tone}`;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 space-y-8 px-4 py-8">
      <section className="space-y-3">
        <p className="text-sm text-muted">톤픽 · 재미로 보는 컬러 테스트 결과</p>
        <h1 className="text-4xl font-bold" style={{ color: info.accent }}>
          {title}
        </h1>
        <p className="text-lg">{info.tagline}</p>
        <p className="text-muted">{info.description}</p>
      </section>

      <section aria-labelledby="palette" className="space-y-3">
        <h2 id="palette" className="text-xl font-bold">
          추천 팔레트
        </h2>
        <ul className="grid grid-cols-3 gap-3">
          {info.lips.map((s) => (
            <li key={s.id} className="flex flex-col items-center gap-1 text-sm">
              <span aria-hidden="true" className="size-14 rounded-full border border-black/10" style={{ background: s.hex }} />
              {s.name}
            </li>
          ))}
        </ul>
        <ul className="flex gap-3">
          {info.blushes.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-sm">
              <span aria-hidden="true" className="size-6 rounded-full border border-black/10" style={{ background: s.hex }} />
              {s.name}
            </li>
          ))}
        </ul>
      </section>

      <ShareButtons season={season} title={title} />

      <AdSlot unit={process.env.NEXT_PUBLIC_ADFIT_UNIT_RESULT} />

      <section aria-labelledby="products" className="space-y-3">
        <h2 id="products" className="text-xl font-bold">
          이런 제품은 어때요
        </h2>
        <ul className="space-y-2">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </ul>
        <p className="text-xs text-muted">이 페이지의 제품 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>
      </section>

      <section className="space-y-3 rounded-3xl bg-accent-soft p-5">
        <p className="font-semibold">나도 해볼래요</p>
        <p className="text-sm text-muted">웹캠이나 셀카로 1초 만에. 사진은 기기 밖으로 나가지 않아요.</p>
        <Link
          href="/try"
          className="inline-block rounded-full bg-accent px-5 py-3 font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          내 컬러 테스트하기
        </Link>
      </section>

      <PrivacyNote compact />
      <Disclaimer />
    </main>
  );
}
