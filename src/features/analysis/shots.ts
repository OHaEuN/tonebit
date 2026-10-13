import type { Lab, Season, ToneResult } from "@/types/analysis";
import { medianLab } from "./sample";
import { classifyTone } from "./tone";

/** 사진 한 장(또는 카메라 측정 한 번)에서 잰 피부색 */
export interface Shot {
  /** 화면에서 사진과 결과를 짝짓는 번호 */
  id: number;
  lab: Lab;
  corrected: boolean;
  /** 이용자가 찍은 흰색 기준으로 보정했는지 */
  whiteFixed?: boolean;
}

/** 한 장만 봤을 때의 판정 */
export function shotResult(shot: Shot): ToneResult {
  return { ...classifyTone(shot.lab), corrected: shot.corrected };
}

/** 합칠 최대 장수. 넘치면 오래된 것부터 버린다 */
export const MAX_SHOTS = 5;
/** 권하는 장수. 이만큼 모이면 더 올리라고 하지 않는다 */
export const RECOMMENDED_SHOTS = 3;

export type SeasonVotes = Partial<Record<Season, number>>;

/**
 * 여러 장을 합쳐 판정한다. 한 장의 조명·각도 운에 덜 휘둘리게 Lab의 채널별 중앙값으로 판정하고,
 * 장마다 시즌이 갈렸으면 경계에 있는 톤이라 확신도를 낮음으로 내린다
 */
export function combineShots(shots: Pick<Shot, "lab" | "corrected">[]): { result: ToneResult; votes: SeasonVotes } {
  const votes: SeasonVotes = {};
  for (const s of shots) {
    const season = classifyTone(s.lab).season;
    votes[season] = (votes[season] ?? 0) + 1;
  }
  const combined = classifyTone(medianLab(shots.map((s) => s.lab)));
  const split = Object.keys(votes).length > 1;
  return {
    result: { ...combined, corrected: shots.every((s) => s.corrected), confidence: split ? "low" : combined.confidence },
    votes,
  };
}
