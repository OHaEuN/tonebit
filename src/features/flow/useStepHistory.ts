"use client";

import { useEffect, useRef } from "react";
import type { Step } from "@/stores/analysisStore";

const STEPS: Step[] = ["tone", "feel", "texture", "pick", "match", "tryon", "tune", "ask"];
const isStep = (v: unknown): v is Step => typeof v === "string" && (STEPS as string[]).includes(v);

/**
 * 단계를 브라우저 히스토리에 얹어 뒤로 가기가 이전 화면으로 가게 한다.
 * 첫 단계는 지금 항목을 바꾸고(replace), 다음 단계부터 쌓는다(push). 뒤로 가면 popstate로 단계만 되돌린다
 */
export function useStepHistory(step: Step, setStep: (s: Step) => void, enabled: boolean) {
  const fromPop = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const onPop = (e: PopStateEvent) => {
      const s = (e.state as { step?: unknown } | null)?.step;
      if (!isStep(s)) return;
      fromPop.current = true;
      setStep(s);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [enabled, setStep]);

  useEffect(() => {
    if (!enabled) return;
    if (fromPop.current) {
      fromPop.current = false;
      return;
    }
    const current = (window.history.state as { step?: unknown } | null)?.step;
    if (current === step) return;
    if (isStep(current)) window.history.pushState({ step }, "");
    else window.history.replaceState({ step }, "");
  }, [step, enabled]);
}
