"use client";

import { toneLabel } from "@/features/recommend/palettes";
import { useAnalysisStore } from "@/stores/analysisStore";

/** 진단된 톤 이름(예: 봄 웜 브라이트). 결과가 없으면 빈 문자열 */
export function useToneLabel(): string {
  const result = useAnalysisStore((s) => s.result);
  return result ? toneLabel(result.season, result.subtype) : "";
}
