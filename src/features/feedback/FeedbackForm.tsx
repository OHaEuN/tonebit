"use client";

import Link from "next/link";
import { useState } from "react";
import { SUBTYPE_LABEL } from "@/features/analysis/explain";
import { SEASON_SUBTYPES } from "@/features/analysis/tone";
import { SEASON_INFO, SEASONS } from "@/features/recommend/palettes";
import { useAnalysisStore } from "@/stores/analysisStore";
import type { Season, Subtype } from "@/types/analysis";
import type { Feedback } from "./schema";

type Status = "idle" | "sending" | "sent" | "error";

const CHIP =
  "inline-block rounded-full border border-line bg-bg px-3 py-1 text-sm peer-checked:border-fg peer-checked:bg-fg peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2";

/**
 * 전문가 진단 결과를 받는다. 동의하면 측정 숫자와 진단만 보내고 사진은 보내지 않는다.
 * 모인 데이터로 기준선을 "전문가 진단과 맞게" 다시 맞춘다
 */
export function FeedbackForm() {
  const combined = useAnalysisStore((s) => s.combined);
  const shots = useAnalysisStore((s) => s.shots);
  const source = useAnalysisStore((s) => s.source);
  const [season, setSeason] = useState<Season | null>(null);
  const [subtype, setSubtype] = useState<Subtype | null>(null);
  const [agree, setAgree] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  if (!process.env.NEXT_PUBLIC_FEEDBACK_ENABLED || !combined || !source) return null;
  if (status === "sent") {
    return (
      <p className="rounded-2xl bg-accent-soft p-4 text-sm">
        보내 주셔서 고마워요. 모인 진단 결과로 판정 기준을 매주 다시 맞춰요.{" "}
        <Link href="/accuracy" className="font-medium text-accent underline">
          지금 일치율 보기
        </Link>
      </p>
    );
  }

  const submit = async () => {
    if (!season || !agree) return;
    setStatus("sending");
    const body: Feedback = {
      season,
      subtype,
      predicted: combined.tone,
      lab: combined.lab,
      hue: combined.hue,
      ita: combined.ita,
      shots: shots.length,
      source,
      corrected: combined.corrected ?? false,
      whiteFixed: shots.some((s) => s.whiteFixed),
    };
    try {
      const res = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <details className="rounded-2xl border border-line p-4 text-sm">
      <summary className="cursor-pointer font-medium">전문가에게 퍼스널 컬러 진단을 받아 봤나요?</summary>
      <div className="mt-3 space-y-4">
        <p className="text-muted">받은 진단 결과를 알려 주시면 톤픽 판정이 전문가 진단과 맞도록 기준을 다듬는 데 써요.</p>
        <div role="radiogroup" aria-label="진단받은 시즌" className="flex flex-wrap gap-1.5">
          {SEASONS.map((s) => (
            <label key={s} className="cursor-pointer">
              <input
                type="radio"
                name="feedback-season"
                className="peer sr-only"
                checked={season === s}
                onChange={() => {
                  setSeason(s);
                  setSubtype(null);
                }}
              />
              <span className={CHIP}>
                {SEASON_INFO[s].label} {SEASON_INFO[s].tone}
              </span>
            </label>
          ))}
        </div>
        {season && (
          <div role="radiogroup" aria-label="진단받은 세부 타입" className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-muted">세부 타입</span>
            {[null, ...SEASON_SUBTYPES[season]].map((t) => (
              <label key={t ?? "unknown"} className="cursor-pointer">
                <input type="radio" name="feedback-subtype" className="peer sr-only" checked={subtype === t} onChange={() => setSubtype(t)} />
                <span className={CHIP}>{t ? SUBTYPE_LABEL[t] : "모름"}</span>
              </label>
            ))}
          </div>
        )}
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
          <span>
            측정 숫자(색상각·밝기·채도)와 위에서 고른 진단 결과만 익명으로 보내는 데 동의해요. <strong>사진은 보내지 않아요.</strong>
          </span>
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={!season || !agree || status === "sending"}
          className="rounded-full bg-accent px-5 py-3 font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "sending" ? "보내는 중…" : "진단 결과 보내기"}
        </button>
        {status === "error" && <p className="text-amber-900">보내지 못했어요. 잠시 뒤에 다시 시도해 주세요.</p>}
      </div>
    </details>
  );
}
