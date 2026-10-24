import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type postgres from "postgres";
import { freshDb, TEST_DB } from "@/test/db";
import { queryAccuracyStats } from "./stats";
import type { Feedback } from "./schema";

const base: Feedback = {
  season: "summer",
  subtype: null,
  predicted: "summer-light",
  lab: { L: 66, a: 13, b: 17 },
  hue: 52.6,
  ita: 40.1,
  shots: 1,
  source: "image",
  corrected: true,
  reference: "scene",
};

describe.skipIf(!TEST_DB)("피드백 저장과 일치율 집계 (Postgres)", () => {
  let sql: postgres.Sql;
  beforeAll(async () => {
    sql = await freshDb();
    process.env.DATABASE_URL = TEST_DB;
  });
  afterAll(async () => {
    await sql?.end();
    const { db } = await import("@/lib/db");
    await db().end();
  });

  it("저장한 진단으로 시즌별·흰색 기준별 일치율을 낸다", async () => {
    const { appendFeedback } = await import("./store");
    await appendFeedback(base); // 맞음
    await appendFeedback({ ...base, predicted: "winter-true" }); // 틀림
    await appendFeedback({ ...base, season: "autumn", predicted: "autumn-deep", reference: "white" }); // 맞음
    await sql`insert into calibration_runs (n, current_version, current_accuracy, cv_accuracy, params, applied, reason) values (3, 'v', 0.5, 0.7, '{}', true, 'test')`;

    const s = await queryAccuracyStats(sql);
    expect(s.total).toEqual({ n: 3, matched: 2 });
    expect(s.bySeason.map((x) => x.season)).toEqual(["summer", "autumn"]);
    expect(s.bySeason[0]).toMatchObject({ n: 2, matched: 1 });
    expect(s.fullyCorrected).toEqual({ n: 1, matched: 1 });
    expect(s.partial).toEqual({ n: 2, matched: 1 });
    expect(s.runs[0]).toMatchObject({ n: 3, cvAccuracy: 0.7, previousAccuracy: 0.5 });
    const [row] = await sql`select calibration from feedback limit 1`;
    expect(row.calibration).toMatch(/fairface|expert/);
  });

  it("결과 반응과 AI 상담 평가를 세고, 반응은 판정 기준 버전과 함께 남는다", async () => {
    const { appendReaction, appendRating } = await import("./store");
    await appendReaction({ verdict: "agree", predicted: "summer-soft", reference: "teeth", source: "image", shots: 1 });
    await appendReaction({ verdict: "disagree", predicted: "winter-deep", reference: "scene", source: "camera", shots: 2 });
    await appendRating({ helpful: true, mode: "ai", products: ["lip-mac-rubywoo"] });
    await appendRating({ helpful: false, mode: "search", products: [] });
    const s = await queryAccuracyStats(sql);
    expect(s.reactions).toEqual({ agree: 1, unsure: 0, disagree: 1 });
    expect(s.advisor).toEqual({ n: 2, helpful: 1, aiN: 1, aiHelpful: 1 });
    const [row] = await sql`select calibration from result_reactions limit 1`;
    expect(row.calibration).toBeTruthy();
  });

  it("데이터가 없으면 0건", async () => {
    await sql`truncate feedback, calibration_runs, result_reactions, advisor_ratings`;
    const s = await queryAccuracyStats(sql);
    expect(s.total).toEqual({ n: 0, matched: 0 });
    expect(s.bySeason).toEqual([]);
    expect(s.reactions).toEqual({ agree: 0, unsure: 0, disagree: 0 });
  });
});
