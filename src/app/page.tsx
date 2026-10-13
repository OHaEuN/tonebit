import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { DrapeHero, type DrapeSeason } from "@/components/DrapeHero";
import { SEASON_INFO, SEASONS } from "@/features/recommend/palettes";

const STEPS = [
  { title: "카메라를 켜거나 사진을 올려요", body: "자연광 아래 정면이 가장 정확해요. 조명이 치우치면 측정 전에 알려 줘요." },
  { title: "볼과 이마의 색을 읽어요", body: "약 1초 동안 20장을 읽어 노란기와 붉은기, 밝기, 채도를 재요. 그 숫자로 웜·쿨과 12가지 시즌 중 하나를 고르고, 왜 그렇게 봤는지도 보여 줘요." },
  { title: "입술과 볼에 발라 봐요", body: "시즌 팔레트와 많이 찾는 립·블러셔 제품의 색을 실시간으로 얹어 보고, 결과 카드를 공유해요." },
];

/** 히어로 드레이프·얼굴에 쓰는 시즌별 색. 팔레트 전체를 클라이언트로 보내지 않게 필요한 값만 추린다 */
const HERO_SEASONS: DrapeSeason[] = SEASONS.map((season) => {
  const info = SEASON_INFO[season];
  return {
    key: season,
    label: `${info.label} ${info.tone}`,
    accent: info.accent,
    lip: info.lips[0].hex,
    blush: info.blushes[0].hex,
    drape: `linear-gradient(180deg, ${info.lips[1].hex} 0%, ${info.lips[0].hex} 48%, ${info.lips[3].hex} 100%)`,
  };
});

export default function LandingPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-16 pt-8">
      <p className="font-serif text-lg font-semibold text-accent">톤픽</p>

      <section className="mt-10">
        <h1 className="break-keep text-[2rem] font-semibold sm:text-5xl">
          내 피부톤에 맞는
          <br />
          립과 블러셔를
          <br />
          얼굴에 직접 얹어 보세요
        </h1>
        <p className="mt-5 max-w-md break-keep text-muted">
          웹캠이나 셀카 한 장으로 웜·쿨과 시즌 톤을 가늠하고, 어울리는 색을 입술과 볼에 실시간으로 발라 봅니다. 재미로 보는 테스트예요.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link
            href="/try"
            className="rounded-lg bg-accent px-6 py-3.5 font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            지금 해보기
          </Link>
          <span className="text-sm text-muted">카메라 대신 사진을 올려도 돼요</span>
        </div>
      </section>

      <DrapeHero seasons={HERO_SEASONS} />

      <section aria-labelledby="privacy" className="mt-16 rounded-2xl bg-accent-soft p-6">
        <h2 id="privacy" className="text-xl font-semibold text-accent">
          사진은 기기 밖으로 나가지 않아요
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed">
          얼굴 인식과 색 분석은 전부 브라우저 안에서 끝나요. 서버로 보내는 이미지가 없고, 외부 서버 연결 자체를 브라우저 보안 정책으로 막아 두었어요. 공유 카드에도 얼굴은
          들어가지 않아요. 개발자 도구의 네트워크 탭을 열어 두고 써 보면 직접 확인할 수 있어요.
        </p>
      </section>

      <section aria-labelledby="how" className="mt-16">
        <h2 id="how" className="text-2xl font-semibold">
          이렇게 진행돼요
        </h2>
        <ol className="mt-6 space-y-6">
          {STEPS.map((step, i) => (
            <li key={step.title} className="grid grid-cols-[2rem_1fr] gap-x-3">
              <span className="font-serif text-2xl font-semibold leading-none text-accent">{i + 1}</span>
              <div>
                <p className="font-semibold">{step.title}</p>
                <p className="mt-1 text-[15px] text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="result" className="mt-16">
        <h2 id="result" className="text-2xl font-semibold">
          결과에서 볼 수 있는 것
        </h2>
        <ul className="mt-5 divide-y divide-line border-y border-line">
          <li className="py-4">
            <p className="font-semibold">웜·쿨과 12가지 시즌 톤, 그렇게 본 이유</p>
            <p className="mt-1 text-[15px] text-muted">색상각, 밝기, 채도 수치를 기준선과 함께 풀어서 설명해요.</p>
          </li>
          <li className="py-4">
            <p className="font-semibold">잘 어울리는 색과 피하면 좋은 색</p>
            <p className="mt-1 text-[15px] text-muted">톤별 특징과 함께 립, 블러셔, 옷 색까지 간단히 짚어요.</p>
          </li>
          <li className="py-4">
            <p className="font-semibold">많이 찾는 립·블러셔를 내 얼굴에</p>
            <p className="mt-1 text-[15px] text-muted">롬앤, 맥, 디올 같은 브랜드의 인기 색을 입술과 볼에 바로 얹어 봐요.</p>
          </li>
        </ul>
      </section>

      <div className="mt-12">
        <Disclaimer />
      </div>
    </main>
  );
}
