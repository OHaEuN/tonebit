/**
 * db/migrations/*.sql을 이름 순서대로 한 번씩 적용한다. 적용한 이름은 schema_migrations에 남긴다.
 * 사용: DATABASE_URL=... pnpm db:migrate
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL이 없어요");
const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
const dir = join(__dirname, "..", "db", "migrations");

async function main() {
  try {
    await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
    const done = new Set((await sql<{ name: string }[]>`select name from schema_migrations`).map((r) => r.name));
    for (const name of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      if (done.has(name)) continue;
      await sql.begin(async (tx) => {
        await tx.unsafe(readFileSync(join(dir, name), "utf8"));
        await tx`insert into schema_migrations (name) values (${name})`;
      });
      console.log(`적용: ${name}`);
    }
    console.log("마이그레이션 완료");
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
