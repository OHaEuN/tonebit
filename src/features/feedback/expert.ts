import { runnerUp } from "@/features/analysis/tone";
import type { Season, Subtype, ToneResult } from "@/types/analysis";

/** 이용자가 받아 본 전문가 진단. 세부 타입은 모르면 null */
export interface ExpertDiagnosis {
  season: Season;
  subtype: Subtype | null;
}

export type ExpertMatch =
  /** 시즌과 세부 타입까지 같거나, 세부 타입을 몰라 시즌만 견줘 같다 */
  | "same"
  /** 시즌은 같고 세부 타입이 다르다 */
  | "subtype"
  /** 전문가 시즌이 톤빛의 다음 후보였다 */
  | "runnerUp"
  | "different";

/** 전문가 진단과 톤빛 판정을 견준다. 다음 후보는 시즌 가능성(odds)에서 고른다 */
export function compareExpert(expert: ExpertDiagnosis, result: Pick<ToneResult, "season" | "subtype">, odds: Record<Season, number>): ExpertMatch {
  if (expert.season === result.season) return !expert.subtype || expert.subtype === result.subtype ? "same" : "subtype";
  return runnerUp(result.season, odds) === expert.season ? "runnerUp" : "different";
}
