import postgres from "postgres";

/**
 * Postgres 연결. Supabase(무료 등급) 기준으로 서버리스에선 트랜잭션 풀러(6543 포트) 주소를 DATABASE_URL에 넣는다.
 * 풀러는 prepared statement를 못 쓰므로 prepare: false. 함수 하나가 연결 하나만 쓰게 max: 1
 */
let client: postgres.Sql | null = null;

export function dbEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function db(): postgres.Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL이 없어요");
  client ??= postgres(url, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 });
  return client;
}
