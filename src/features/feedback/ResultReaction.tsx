"use client";

import { useState } from "react";
import { useAnalysisStore } from "@/stores/analysisStore";
import type { Verdict } from "./reactions";

const OPTIONS: [Verdict, string][] = [
  ["agree", "비슷해요"],
  ["unsure", "잘 모르겠어요"],
  ["disagree", "달라요"],
];

/** 전문가 진단 입력 칸을 펼치고 그리로 내린다. 넘어온 걸 알 수 있게 칸을 상자로 띄우고 첫 시즌 칩에 초점을 둔다 */
export function openExpertFeedback() {
  const el = document.getElementById("expert-feedback") as HTMLDetailsElement | null;
  if (!el) return;
  el.open = true;
  el.dataset.spotlight = "";
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.querySelector<HTMLElement>("input[type=radio]")?.focus({ preventScroll: true });
}

/**
 * 결과 바로 아래 한 번 누르는 반응. 전문가 진단보다 훨씬 많이 모여 "체감 정확도"를 본다.
 * 달라요를 고르면 전문가 진단 입력으로 이어 준다. 판정·조명 기준만 보내고 사진은 보내지 않는다
 */
export function ResultReaction() {
  const result = useAnalysisStore((s) => s.result);
  const source = useAnalysisStore((s) => s.source);
  const shots = useAnalysisStore((s) => s.shots);
  const setTab = useAnalysisStore((s) => s.setResultTab);
  const [sent, setSent] = useState<Verdict | null>(null);
  const [error, setError] = useState(false);
  if (!process.env.NEXT_PUBLIC_FEEDBACK_ENABLED || !result || !source) return null;

  const send = async (verdict: Verdict) => {
    setSent(verdict);
    setError(false);
    try {
      const res = await fetch("/api/feedback/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict, predicted: result.tone, reference: result.reference ?? "none", source, shots: Math.max(1, Math.min(10, shots.length)) }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setSent(null);
      setError(true);
    }
  };

  return (
    <div className="mt-5 rounded-[12px] bg-card px-4 py-3.5" aria-live="polite">
      {sent === null ? (
        <>
          <p className="text-[14px] font-medium">이 결과, 내 생각과 비슷해요?</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {OPTIONS.map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => void send(v)}
                className="inline-flex h-9 items-center rounded-[6px] border border-fg/20 bg-bg px-3.5 text-[13px] transition-colors hover:border-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
              >
                {label}
              </button>
            ))}
          </div>
          {error && <p className="mt-2 text-[13px] text-amber-900">보내지 못했어요. 다시 눌러 주세요.</p>}
        </>
      ) : (
        <p className="text-[14px]">
          알려 주셔서 고마워요. 판정 기준을 다듬는 데 써요.
          {sent !== "agree" && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => {
                  // 진단 입력 칸은 "결과" 탭에 있다. 탭을 바꾼 뒤 그려지면 펼친다
                  setTab("result");
                  window.setTimeout(openExpertFeedback, 50);
                }}
                className="font-medium underline underline-offset-4"
              >
                전문가 진단을 받아 봤다면 알려 주세요
              </button>
            </>
          )}
        </p>
      )}
    </div>
  );
}
