"use client";

import Link from "next/link";
import { useState } from "react";
import { Disclosure } from "@/components/Disclosure";
import { BUTTON } from "@/components/styles";
import { track } from "@/features/analytics/track";
import { useAnalysisStore } from "@/stores/analysisStore";
import type { ExpertDiagnosis } from "./expert";
import { ExpertChoice } from "./ExpertChoice";
import { progressText } from "./progress";
import { sendExpertFeedback } from "./send";
import { useFeedbackProgress } from "./useFeedbackProgress";

/**
 * 결과를 본 뒤에 전문가 진단을 알려 주는 칸. 시작할 때 이미 골랐다면 결과 위 비교 카드가 대신한다.
 * 버튼 하나로 동의하고 보낸다. 측정 숫자와 진단만 보내고 사진은 보내지 않는다
 */
export function FeedbackForm() {
  const combined = useAnalysisStore((s) => s.combined);
  const shots = useAnalysisStore((s) => s.shots);
  const source = useAnalysisStore((s) => s.source);
  const preset = useAnalysisStore((s) => s.expert);
  const sent = useAnalysisStore((s) => s.expertSent);
  const markSent = useAnalysisStore((s) => s.markExpertSent);
  const [expert, setExpert] = useState<ExpertDiagnosis | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [version, setVersion] = useState(0);
  const tally = useFeedbackProgress(version);

  if (!process.env.NEXT_PUBLIC_FEEDBACK_ENABLED || !combined || !source || preset) return null;
  if (sent) {
    return (
      <p className="border-t border-line py-4 text-sm">
        보내 주셔서 고마워요. 모인 진단 결과로 판정 기준을 매주 다시 맞춰요.{" "}
        <Link href="/accuracy" className="font-medium underline">
          지금 일치율 보기
        </Link>
        {tally && <span className="mt-1 block text-[12px] text-muted">{progressText(tally.n, tally.matched)}</span>}
      </p>
    );
  }

  const submit = async () => {
    if (!expert) return;
    setStatus("sending");
    if (await sendExpertFeedback(expert, combined, shots.length, source)) {
      markSent();
      setStatus("idle");
      setVersion((v) => v + 1);
      track({ name: "expert-sent", via: "form", same: expert.season === combined.season });
    } else {
      setStatus("error");
    }
  };

  return (
    <Disclosure
      id="expert-feedback"
      title="전문가에게 퍼스널 컬러 진단을 받아 봤나요?"
      hint={tally ? progressText(tally.n, tally.matched) : "알려 주시면 판정 기준을 전문가 진단에 맞게 다듬어요"}
    >
      <div className="space-y-4">
        {/* 결과 반응에서 넘어왔을 때만(Disclosure에 data-spotlight) 보인다 */}
        <p className="hidden text-[14px] font-medium group-data-[spotlight]:block">받아 본 진단을 골라 주시면, 다음 판정부터 그 기준에 맞춰 가요.</p>
        <ExpertChoice name="feedback" value={expert} onChange={setExpert} />
        <p className="text-muted">
          측정 숫자(색상각·밝기·채도)와 고른 진단만 익명으로 보내요. <strong className="font-medium text-fg">사진은 보내지 않아요.</strong>
        </p>
        <button type="button" onClick={() => void submit()} disabled={!expert || status === "sending"} className={BUTTON.primary}>
          {status === "sending" ? "보내는 중…" : "동의하고 보내기"}
        </button>
        {status === "error" && <p className="text-amber-900">보내지 못했어요. 잠시 뒤에 다시 시도해 주세요.</p>}
      </div>
    </Disclosure>
  );
}
