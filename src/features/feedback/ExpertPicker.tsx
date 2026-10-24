"use client";

import { useEffect, useRef } from "react";
import { track } from "@/features/analytics/track";
import { useAnalysisStore } from "@/stores/analysisStore";
import { ExpertChoice } from "./ExpertChoice";

/**
 * 시작 화면에서 받아 본 전문가 진단을 먼저 고르게 한다(건너뛰어도 된다). 결과 화면에서 톤빛 판정과 견줘 보여 준다.
 * 공유 결과 페이지의 "비교해 보기"(/try#expert)로 들어오면 이 칸을 띄워 둔다
 */
export function ExpertPicker() {
  const expert = useAnalysisStore((s) => s.expert);
  const setExpert = useAnalysisStore((s) => s.setExpert);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.location.hash !== "#expert" || !ref.current) return;
    ref.current.dataset.spotlight = "";
    ref.current.scrollIntoView({ block: "center" });
  }, []);

  return (
    <div ref={ref} id="expert" className="mt-8 scroll-mt-24 rounded-[12px] border border-line p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[14px] font-medium">전문가에게 받은 진단이 있나요?</p>
        {expert ? (
          <button type="button" onClick={() => setExpert(null)} className="shrink-0 text-[12px] text-muted underline underline-offset-2">
            선택 지우기
          </button>
        ) : (
          <span className="shrink-0 text-[12px] text-muted">선택</span>
        )}
      </div>
      <p className="mb-3 mt-0.5 text-[13px] text-muted">고르면 결과에서 톤빛 판정과 비교해 드려요.</p>
      <ExpertChoice
        name="expert-preset"
        value={expert}
        onChange={(e) => {
          if (e.season !== expert?.season) track({ name: "expert-preset", season: e.season });
          setExpert(e);
        }}
      />
    </div>
  );
}
