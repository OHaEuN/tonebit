import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

/** DB 통합 테스트용. TEST_DATABASE_URL이 있을 때만 돈다(CI는 pgvector 컨테이너를 띄운다) */
export const TEST_DB = process.env.TEST_DATABASE_URL;

/** 빈 스키마에 마이그레이션을 전부 적용한 연결 */
export async function freshDb(): Promise<postgres.Sql> {
  const sql = postgres(TEST_DB!, { max: 1, onnotice: () => {} });
  await sql.unsafe("drop schema public cascade; create schema public;");
  const dir = join(process.cwd(), "db", "migrations");
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) await sql.unsafe(readFileSync(join(dir, f), "utf8"));
  return sql;
}
