import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { PrivacyNote } from "@/components/PrivacyNote";
import { SEASONS, SEASON_INFO } from "@/features/recommend/palettes";

const STEPS = [
  { title: "카메라 또는 사진", body: "웹캠을 켜거나 셀카를 올려요. 자연광 아래가 가장 정확해요." },
  { title: "피부톤 읽기", body: "볼과 이마의 색을 읽어 웜·쿨과 시즌 톤을 추정해요. 약 1초면 돼요." },
  { title: "립 발라보기", body: "추천 팔레트를 입술에 실시간으로 얹어 보고, 결과 카드를 공유해요." },
];

export default function LandingPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 space-y-10 px-4 py-10">
      <section className="space-y-5">
        <p className="text-sm font-medium text-accent">재미로 보는 컬러 테스트</p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight">
          내 피부톤에 맞는
          <br />
          립 컬러, 지금 발라보기
        </h1>
        <p className="text-muted">
          웹캠이나 셀카 한 장으로 웜·쿨 톤을 가늠하고, 어울리는 립과 블러셔를 얼굴에 바로 얹어 볼 수 있어요.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/try"
            className="rounded-full bg-accent px-6 py-3 font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            지금 해보기
          </Link>
        </div>
        <p className="text-xs text-muted">카메라 없이 사진 업로드로도 할 수 있어요.</p>
      </section>

      <PrivacyNote />

      <section aria-labelledby="how" className="space-y-4">
        <h2 id="how" className="text-xl font-bold">
          이렇게 진행돼요
        </h2>
        <ol className="space-y-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3 rounded-2xl border border-line bg-card p-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">{i + 1}</span>
              <div>
                <p className="font-semibold">{step.title}</p>
                <p className="text-sm text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="seasons" className="space-y-4">
        <h2 id="seasons" className="text-xl font-bold">
          네 가지 시즌 톤
        </h2>
        <ul className="grid grid-cols-2 gap-3">
          {SEASONS.map((season) => {
            const info = SEASON_INFO[season];
            return (
              <li key={season} className="rounded-2xl border border-line bg-card p-4">
                <p className="font-semibold" style={{ color: info.accent }}>
                  {info.label} {info.tone}
                </p>
                <div className="mt-2 flex gap-1">
                  {info.lips.slice(0, 4).map((s) => (
                    <span key={s.id} aria-hidden="true" className="size-5 rounded-full" style={{ background: s.hex }} />
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <Disclaimer />
    </main>
  );
}
