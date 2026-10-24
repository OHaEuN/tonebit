"use client";

import Link from "next/link";
import { useState } from "react";
import { BUTTON } from "@/components/styles";
import { seasonOdds } from "@/features/analysis/tone";
import { track } from "@/features/analytics/track";
import { SEASON_INFO, toneLabel } from "@/features/recommend/palettes";
import { useAnalysisStore } from "@/stores/analysisStore";
import { compareExpert, type ExpertDiagnosis, type ExpertMatch } from "./expert";
import { progressText } from "./progress";
import { sendExpertFeedback } from "./send";
import { useFeedbackProgress } from "./useFeedbackProgress";

const VERDICT: Record<ExpertMatch, string> = {
  same: "시즌이 같아요",
  subtype: "시즌은 같고, 세부 타입이 달라요",
  runnerUp: "시즌이 달라요. 전문가 진단은 톤빛의 다음 후보였어요",
  different: "시즌이 달라요",
};

const expertLabel = (e: ExpertDiagnosis) => (e.subtype ? toneLabel(e.season, e.subtype) : `${SEASON_INFO[e.season].label} ${SEASON_INFO[e.season].tone}`);

/**
 * 시작할 때 고른 전문가 진단과 톤빛 판정(합친 결과)을 나란히 보여 준다. 결과 반응 대신 이 자리에 뜬다.
 * 버튼 하나로 동의하고 보내면 그 진단이 기준 재보정 데이터가 된다
 */
export function ExpertCompare() {
  const expert = useAnalysisStore((s) => s.expert);
  const combined = useAnalysisStore((s) => s.combined);
  const shots = useAnalysisStore((s) => s.shots);
  const source = useAnalysisStore((s) => s.source);
  const sent = useAnalysisStore((s) => s.expertSent);
  const markSent = useAnalysisStore((s) => s.markExpertSent);
  const setExpert = useAnalysisStore((s) => s.setExpert);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [version, setVersion] = useState(0);
  const tally = useFeedbackProgress(version);
  if (!expert || !combined || !source) return null;

  const reference = combined.reference ?? "none";
  const match = compareExpert(expert, combined, seasonOdds(combined.lab, reference));
  const fullReference = reference === "white" || reference === "locked";
  const canSend = Boolean(process.env.NEXT_PUBLIC_FEEDBACK_ENABLED);

  const send = async () => {
    setStatus("sending");
    if (await sendExpertFeedback(expert, combined, shots.length, source)) {
      markSent();
      setStatus("idle");
      setVersion((v) => v + 1);
      track({ name: "expert-sent", via: "compare", same: match === "same" });
    } else {
      setStatus("error");
    }
  };

  return (
    <div className="mt-5 rounded-[12px] bg-card px-4 py-3.5" aria-live="polite">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-[14px]">
        <dt className="text-muted">전문가 진단</dt>
        <dd className="font-medium">{expertLabel(expert)}</dd>
        <dt className="text-muted">톤빛 판정</dt>
        <dd className="font-medium">{toneLabel(combined.season, combined.subtype)}</dd>
      </dl>
      <p className="mt-2.5 text-[15px] font-semibold">{VERDICT[match]}</p>
      {match !== "same" && !fullReference && (
        <p className="mt-1 text-[13px] text-muted">흰 종이를 얼굴 옆에 두고 다시 찍으면 조명 때문인지 알 수 있어요.</p>
      )}

      {canSend && (
        <div className="mt-3 border-t border-line pt-3">
          {sent ? (
            <p className="text-[13px]">보내 주셔서 고마워요. 모인 진단으로 판정 기준을 매주 다시 맞춰요.</p>
          ) : (
            <>
              <p className="text-[13px] text-muted">
                이 비교를 보내 주시면 판정 기준을 전문가 진단에 맞게 다듬어요. 측정 숫자와 이 진단만 익명으로 보내고, <strong className="font-medium text-fg">사진은 보내지 않아요.</strong>
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => void send()} disabled={status === "sending"} className={`${BUTTON.small} border-fg bg-fg text-white hover:opacity-85 disabled:opacity-35`}>
                  {status === "sending" ? "보내는 중…" : "동의하고 보내기"}
                </button>
                <button type="button" onClick={() => setExpert(null)} className="text-[13px] text-muted underline underline-offset-2">
                  진단 지우기
                </button>
              </div>
              {status === "error" && <p className="mt-2 text-[13px] text-amber-900">보내지 못했어요. 다시 눌러 주세요.</p>}
            </>
          )}
          {tally && (
            <p className="mt-2 text-[12px] text-muted">
              {progressText(tally.n, tally.matched)} ·{" "}
              <Link href="/accuracy" className="underline underline-offset-2">
                정확도 보기
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
