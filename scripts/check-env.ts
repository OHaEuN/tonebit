/**
 * 운영 설정 점검(읽기만 한다). PR에서 머지 전에 돌려 DB·Gemini 연결과 적용될 마이그레이션을 미리 본다.
 * 사용: DATABASE_URL=... GEMINI_API_KEY=... pnpm check:env
 */
import { appendFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { CHAT_MODELS, EMBED_MODEL } from "../src/features/advisor/gemini";

const lines: string[] = ["## 운영 설정 점검", ""];
let failed = false;
const ok = (s: string) => lines.push(`- ✅ ${s}`);
const bad = (s: string) => {
  lines.push(`- ❌ ${s}`);
  failed = true;
};

async function checkDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return bad("DATABASE_URL이 없어요");
  const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15, onnotice: () => {} });
  try {
    const [{ version }] = await sql<{ version: string }[]>`select current_setting('server_version') as version`;
    ok(`DB 연결 (Postgres ${version})`);
    const [vec] = await sql<{ installed: string | null }[]>`select installed_version as installed from pg_available_extensions where name = 'vector'`;
    if (!vec) bad("pgvector 확장을 쓸 수 없어요");
    else ok(`pgvector ${vec.installed ? `설치됨(${vec.installed})` : "설치 가능(마이그레이션이 설치)"}`);
    const [{ exists }] = await sql<{ exists: boolean }[]>`select to_regclass('public.schema_migrations') is not null as exists`;
    const done = exists ? new Set((await sql<{ name: string }[]>`select name from schema_migrations`).map((r) => r.name)) : new Set<string>();
    const pending = readdirSync(join(__dirname, "..", "db", "migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .filter((f) => !done.has(f));
    ok(pending.length ? `머지하면 적용될 마이그레이션: ${pending.join(", ")}` : "마이그레이션 모두 적용됨");
  } catch (e) {
    bad(`DB 연결 실패: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await sql.end();
  }
}

async function checkGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return bad("GEMINI_API_KEY가 없어요");
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return bad(`Gemini 키 확인 실패: HTTP ${res.status}`);
    const names = new Set(((await res.json()) as { models?: { name: string }[] }).models?.map((m) => m.name.replace(/^models\//, "")) ?? []);
    ok("Gemini 키 유효");
    const usable = CHAT_MODELS.filter((m) => names.has(m));
    if (usable.length) ok(`상담 모델 후보: ${usable.join(" → ")}`);
    else bad(`상담 모델(${CHAT_MODELS.join(", ")})이 목록에 없어요. GEMINI_MODEL을 바꿔 주세요`);
    if (names.has(EMBED_MODEL)) ok(`임베딩 모델: ${EMBED_MODEL}`);
    else bad(`임베딩 모델 ${EMBED_MODEL}이 목록에 없어요`);
  } catch (e) {
    bad(`Gemini 확인 실패: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function main() {
  await checkDb();
  await checkGemini();
  const report = lines.join("\n");
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + "\n");
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
