import type { Metadata } from "next";
import Link from "next/link";
import calibration from "@/features/analysis/calibration.json";
import { getAccuracyStats, type Tally } from "@/features/feedback/stats";
import { SEASON_INFO } from "@/features/recommend/palettes";

export const metadata: Metadata = {
  title: "정확도",
  description: "톤픽 판정이 이용자가 받은 전문가 퍼스널 컬러 진단과 얼마나 맞는지, 모인 진단으로 기준을 어떻게 다시 맞췄는지 공개해요.",
};

/** 이보다 적으면 비율을 보여 주지 않는다(몇 건으로 낸 퍼센트는 오해를 부른다) */
const MIN_TO_SHOW = 20;

const pct = (t: Tally) => Math.round((t.matched / t.n) * 100);

export default async function AccuracyPage() {
  const stats = await getAccuracyStats();
  const total = stats?.total ?? { n: 0, matched: 0 };
  const enough = total.n >= MIN_TO_SHOW;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 space-y-10 px-4 py-10 text-[15px] leading-relaxed">
      <header className="space-y-3">
        <p className="text-sm text-muted">톤픽 정확도</p>
        <h1 className="text-3xl font-semibold">전문가 진단과 얼마나 맞을까요</h1>
        <p className="text-muted">
          결과 화면에서 &ldquo;전문가 진단을 받아 봤다&rdquo;고 알려 준 분들의 진단과, 그때 톤픽이 낸 판정을 시즌 단위로 비교해요. 사진은 받지 않고 측정 숫자와 진단만
          모아요.
        </p>
      </header>

      {!enough ? (
        <section className="space-y-3 rounded-3xl bg-card p-6">
          <p className="text-lg font-medium">아직 모으는 중이에요</p>
          <p className="text-muted">
            지금까지 {total.n}건이 모였어요. {MIN_TO_SHOW}건이 넘으면 일치율을 공개할게요. 전문가 진단을 받아 본 적이 있다면 테스트 결과 화면에서 알려 주세요.
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-black/10" aria-hidden="true">
            <div className="h-full bg-accent" style={{ width: `${Math.min(100, (total.n / MIN_TO_SHOW) * 100)}%` }} />
          </div>
        </section>
      ) : (
        <>
          <section className="space-y-2">
            <p className="font-serif text-6xl font-semibold text-accent">{pct(total)}%</p>
            <p>
              전문가 진단 <strong>{total.n.toLocaleString()}건</strong> 중 <strong>{total.matched.toLocaleString()}건</strong>에서 시즌이 같았어요. 네 시즌 중 하나를 그냥 고르면
              25%예요.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">시즌별</h2>
            <ul className="space-y-3">
              {stats!.bySeason.map((s) => {
                const info = SEASON_INFO[s.season];
                return (
                  <li key={s.season} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>
                        전문가가 {info.label} {info.tone}이라고 한 {s.n}건
                      </span>
                      <span className="font-medium">{s.n >= 5 ? `${pct(s)}%` : "—"}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/10" aria-hidden="true">
                      <div className="h-full" style={{ width: `${s.n >= 5 ? pct(s) : 0}%`, background: info.accent }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {stats!.whiteFixed.n >= 5 && stats!.plain.n >= 5 && (
            <section className="space-y-2">
              <h2 className="text-xl font-semibold">흰색 기준을 맞추면</h2>
              <p>
                사진 속 흰 종이·흰 벽으로 조명을 맞춘 진단은 <strong>{pct(stats!.whiteFixed)}%</strong>, 맞추지 않은 진단은 <strong>{pct(stats!.plain)}%</strong> 맞았어요
                <span className="text-muted">
                  {" "}
                  (각 {stats!.whiteFixed.n}건, {stats!.plain.n}건)
                </span>
                .
              </p>
            </section>
          )}
        </>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">기준을 다시 맞추는 방법</h2>
        <p>
          매주 한 번, 모인 진단으로 웜·쿨과 라이트·딥을 가르는 기준값을 다시 찾아요. 그 데이터로 맞춘 기준을 같은 데이터로 채점하면 실제보다 좋아 보이니까, 다섯 묶음으로 나눠
          네 묶음으로 맞추고 남은 한 묶음으로 채점해요(교차검증). 지금 기준보다 2%p 넘게 나을 때만 바꾸고, 바뀐 기준은 사람이 확인한 뒤에 반영해요.
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-2xl bg-card p-4 text-sm">
          <dt className="text-muted">지금 기준</dt>
          <dd>{calibration.version}</dd>
          <dt className="text-muted">근거</dt>
          <dd>{calibration.basis}</dd>
        </dl>
        {stats && stats.runs.length > 0 && (
          <ul className="space-y-1 text-sm">
            {stats.runs.map((r) => (
              <li key={r.date}>
                {r.date} · {r.n}건으로 다시 맞춤 · 일치율 {Math.round(r.previousAccuracy * 100)}% → {Math.round(r.cvAccuracy * 100)}%
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/try" className="inline-block text-accent hover:underline">
        테스트 해 보기 →
      </Link>
    </main>
  );
}
