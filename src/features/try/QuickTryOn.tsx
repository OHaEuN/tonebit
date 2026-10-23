"use client";

import { useState } from "react";
import { ColorPicker } from "@/features/lipTryOn/ColorPicker";
import { useAnalysisStore } from "@/stores/analysisStore";
import { useTrySwatches, type Part } from "./useTrySwatches";


/** 크게 보기 아래에 붙는 색 바꾸기. 확대한 채로 립·블러셔 색만 빠르게 넘겨 본다 */
export function QuickTryOn() {
  const [part, setPart] = useState<Part>("lip");
  const sections = useTrySwatches(part);
  const lipId = useAnalysisStore((s) => s.lipId);
  const blushId = useAnalysisStore((s) => s.blushId);
  const selectLip = useAnalysisStore((s) => s.selectLip);
  const selectBlush = useAnalysisStore((s) => s.selectBlush);
  if (!sections.length) return null;
  const isLip = part === "lip";
  return (
    <div className="space-y-2">
      <div role="tablist" aria-label="바를 곳" className="grid grid-cols-2 gap-1 rounded-[8px] bg-card p-1">
        {(
          [
            ["lip", "립"],
            ["blush", "블러셔"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={part === key}
            onClick={() => setPart(key)}
            className={`h-9 rounded-[6px] text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg ${
              part === key ? "bg-fg text-white" : "text-muted hover:text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <ColorPicker
        key={part}
        name={`viewer-${part}`}
        label={isLip ? "립" : "블러셔"}
        sections={sections}
        value={isLip ? lipId : blushId}
        onChange={isLip ? selectLip : selectBlush}
      />
    </div>
  );
}
