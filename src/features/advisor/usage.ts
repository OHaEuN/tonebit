import type { Sql } from "postgres";

/** Gemini 무료 등급 하루 요청 한도(모델마다 100~250회) 안에서 쓰도록 하루 호출 수를 센다 */
export const DAILY_CAP = Number(process.env.ADVISOR_DAILY_CAP ?? 200);

/** 오늘(한국 시간) 남은 호출이 있는지 */
export async function hasBudget(sql: Sql): Promise<boolean> {
  const [row] = await sql<{ calls: number }[]>`select calls from advisor_usage where day = (now() at time zone 'Asia/Seoul')::date`;
  return (row?.calls ?? 0) < DAILY_CAP;
}

export async function recordCalls(sql: Sql, calls: number): Promise<void> {
  if (calls <= 0) return;
  await sql`
    insert into advisor_usage (day, calls) values ((now() at time zone 'Asia/Seoul')::date, ${calls})
    on conflict (day) do update set calls = advisor_usage.calls + excluded.calls
  `;
}
