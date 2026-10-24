import { CALIBRATION_VERSION } from "@/features/analysis/constants";
import { db, dbEnabled } from "@/lib/db";
import type { AdvisorRating, ResultReaction } from "./reactions";
import type { Feedback } from "./schema";

/** 피드백 저장소: Postgres(feedback 테이블). DATABASE_URL이 있어야 켜진다 */
export const feedbackEnabled = dbEnabled;

export async function appendFeedback(f: Feedback): Promise<void> {
  await db()`
    insert into feedback
      (expert_season, expert_subtype, predicted, lab_l, lab_a, lab_b, hue, ita, shots, source, corrected, reference, calibration)
    values
      (${f.season}, ${f.subtype}, ${f.predicted}, ${f.lab.L}, ${f.lab.a}, ${f.lab.b}, ${f.hue}, ${f.ita}, ${f.shots}, ${f.source}, ${f.corrected}, ${f.reference}, ${CALIBRATION_VERSION})
  `;
}

export async function readFeedback(): Promise<Record<string, unknown>[]> {
  return [...(await db()<Record<string, unknown>[]>`select * from feedback order by id`)];
}

export async function appendReaction(r: ResultReaction): Promise<void> {
  await db()`
    insert into result_reactions (verdict, predicted, reference, source, shots, calibration)
    values (${r.verdict}, ${r.predicted}, ${r.reference}, ${r.source}, ${r.shots}, ${CALIBRATION_VERSION})
  `;
}

export async function appendRating(r: AdvisorRating): Promise<void> {
  await db()`insert into advisor_ratings (helpful, mode, products) values (${r.helpful}, ${r.mode}, ${r.products})`;
}
