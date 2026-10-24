import type { Source } from "@/stores/analysisStore";
import type { ToneResult } from "@/types/analysis";
import type { ExpertDiagnosis } from "./expert";
import type { Feedback } from "./schema";

/** 전문가 진단 한 건을 보낸다. 합친 판정의 측정 숫자와 진단만 싣고 사진은 싣지 않는다 */
export async function sendExpertFeedback(expert: ExpertDiagnosis, combined: ToneResult, shots: number, source: Source): Promise<boolean> {
  const body: Feedback = {
    season: expert.season,
    subtype: expert.subtype,
    predicted: combined.tone,
    lab: combined.lab,
    hue: combined.hue,
    ita: combined.ita,
    shots,
    source,
    corrected: combined.corrected ?? false,
    reference: combined.reference ?? "none",
  };
  try {
    const res = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return res.ok;
  } catch {
    return false;
  }
}
