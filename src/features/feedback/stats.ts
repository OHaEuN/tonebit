import { cacheLife, cacheTag } from "next/cache";
import type { Sql } from "postgres";
import { db, dbEnabled } from "@/lib/db";
import type { Season } from "@/types/analysis";

export interface Tally {
  n: number;
  matched: number;
}

export interface AccuracyStats {
  total: Tally;
  bySeason: (Tally & { season: Season })[];
  byMonth: (Tally & { month: string })[];
  /** 사진 속 흰색으로 조명을 맞춘 진단과 아닌 진단 */
  whiteFixed: Tally;
  plain: Tally;
  /** 기준값을 실제로 바꾼 재보정 기록(최근 순) */
  runs: { date: string; n: number; cvAccuracy: number; previousAccuracy: number }[];
}

/** 새 진단이 들어오면 이 태그로 집계 캐시를 비운다 */
export const ACCURACY_TAG = "accuracy";

const EMPTY: Tally = { n: 0, matched: 0 };

/**
 * 전문가 진단과 톤픽 판정(보낸 그 순간의 판정)이 시즌 단위로 얼마나 맞았는지. 집계는 SQL 한 번으로 끝낸다.
 * 사람 단위 값은 내보내지 않고 건수만 낸다. 한 시간 캐시
 */
export async function getAccuracyStats(): Promise<AccuracyStats | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(ACCURACY_TAG);
  if (!dbEnabled()) return null;
  try {
    return await queryAccuracyStats(db());
  } catch (e) {
    console.error("accuracy stats", e);
    return null;
  }
}

const ORDER: Season[] = ["spring", "summer", "autumn", "winter"];

/** 집계 쿼리. 캐시와 분리해 실제 Postgres로 테스트한다 */
export async function queryAccuracyStats(sql: Sql): Promise<AccuracyStats> {
  const [row] = await sql<{ stats: AccuracyStats }[]>`
    with f as (
      select expert_season, white_fixed, created_at, split_part(predicted, '-', 1) = expert_season as hit
      from feedback
    ),
    tally as (
      select count(*)::int as n, (count(*) filter (where hit))::int as matched from f
    )
    select json_build_object(
      'total', (select row_to_json(tally) from tally),
      'bySeason', (
        select coalesce(json_agg(s order by s.season), '[]')
        from (select expert_season as season, count(*)::int as n, (count(*) filter (where hit))::int as matched from f group by 1) s
      ),
      'byMonth', (
        select coalesce(json_agg(m order by m.month), '[]')
        from (
          select to_char(date_trunc('month', created_at at time zone 'Asia/Seoul'), 'YYYY-MM') as month,
                 count(*)::int as n, (count(*) filter (where hit))::int as matched
          from f group by 1 order by 1 desc limit 6
        ) m
      ),
      'whiteFixed', (select json_build_object('n', count(*), 'matched', count(*) filter (where hit)) from f where white_fixed),
      'plain', (select json_build_object('n', count(*), 'matched', count(*) filter (where hit)) from f where not white_fixed),
      'runs', (
        select coalesce(json_agg(r), '[]')
        from (
          select to_char(created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD') as date, n, cv_accuracy as "cvAccuracy", current_accuracy as "previousAccuracy"
          from calibration_runs where applied order by id desc limit 5
        ) r
      )
    ) as stats
  `;
  const s = row.stats;
  return {
    ...s,
    bySeason: [...s.bySeason].sort((a, b) => ORDER.indexOf(a.season) - ORDER.indexOf(b.season)),
    total: s.total ?? EMPTY,
    whiteFixed: s.whiteFixed ?? EMPTY,
    plain: s.plain ?? EMPTY,
  };
}
