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
  whiteFixed: false,
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
    await appendFeedback({ ...base, season: "autumn", predicted: "autumn-deep", whiteFixed: true }); // 맞음
    await sql`insert into calibration_runs (n, current_version, current_accuracy, cv_accuracy, params, applied, reason) values (3, 'v', 0.5, 0.7, '{}', true, 'test')`;

    const s = await queryAccuracyStats(sql);
    expect(s.total).toEqual({ n: 3, matched: 2 });
    expect(s.bySeason.map((x) => x.season)).toEqual(["summer", "autumn"]);
    expect(s.bySeason[0]).toMatchObject({ n: 2, matched: 1 });
    expect(s.whiteFixed).toEqual({ n: 1, matched: 1 });
    expect(s.plain).toEqual({ n: 2, matched: 1 });
    expect(s.runs[0]).toMatchObject({ n: 3, cvAccuracy: 0.7, previousAccuracy: 0.5 });
    const [row] = await sql`select calibration from feedback limit 1`;
    expect(row.calibration).toMatch(/fairface|expert/);
  });

  it("데이터가 없으면 0건", async () => {
    await sql`truncate feedback, calibration_runs`;
    const s = await queryAccuracyStats(sql);
    expect(s.total).toEqual({ n: 0, matched: 0 });
    expect(s.bySeason).toEqual([]);
  });
});
