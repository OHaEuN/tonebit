/**
 * 제품·가이드 지식을 DB에 넣고 임베딩한다. 바뀐 것만 다시 임베딩한다.
 * 사용: DATABASE_URL=... GEMINI_API_KEY=... pnpm db:seed
 */
import postgres from "postgres";
import { gemini, geminiEnabled } from "../src/features/advisor/gemini";
import { seedKnowledge } from "../src/features/advisor/seed";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL이 없어요");
  const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
  try {
    if (!geminiEnabled()) console.warn("GEMINI_API_KEY가 없어 임베딩 없이 넣어요(키워드 검색으로 동작)");
    const r = await seedKnowledge(sql, geminiEnabled() ? gemini : null);
    console.log(`제품 ${r.products} · 가이드 ${r.guides} · 새로 임베딩 ${r.embedded} · 임베딩 없음 ${r.missingEmbeddings}`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
