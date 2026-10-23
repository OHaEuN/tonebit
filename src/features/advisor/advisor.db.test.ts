import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type postgres from "postgres";
import { freshDb, TEST_DB } from "@/test/db";
import { runAgent, runFallback, type AdvisorEvent } from "./agent";
import { EMBED_DIM, type ChatModel, type Content, type Embedder } from "./gemini";
import { seedKnowledge } from "./seed";
import { searchProducts, type Profile, type ToolContext } from "./tools";
import { hasBudget, recordCalls } from "./usage";

/** 낱말 주머니를 해시해 만든 가짜 임베딩. 겹치는 낱말이 많을수록 가깝다(결정적) */
const fakeEmbedder: Embedder & { calls: number } = {
  calls: 0,
  async embed(texts) {
    this.calls += texts.length;
    return texts.map((t) => {
      const v = new Array(EMBED_DIM).fill(0);
      for (const w of t.split(/[\s,.·]+/).filter(Boolean)) {
        let h = 0;
        for (const ch of w) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
        v[h % EMBED_DIM] += 1;
      }
      const n = Math.hypot(...v) || 1;
      return v.map((x) => x / n);
    });
  },
};

const SUMMER: Profile = { season: "summer", subtype: "soft", hue: 47, ita: 30, chroma: 21 };

/** 각본대로 답하는 가짜 모델. 각 단계가 지금까지의 대화를 보고 응답을 만든다 */
function scripted(steps: ((contents: Content[]) => Content["parts"])[]): ChatModel & { seen: Content[][] } {
  let i = 0;
  const seen: Content[][] = [];
  return {
    seen,
    async generate({ contents }) {
      seen.push(structuredClone(contents));
      return { role: "model", parts: steps[i++](contents) };
    },
  };
}

const lastResults = (contents: Content[]) =>
  (contents.at(-1)!.parts[0].functionResponse!.response as { results: { id: string }[] }).results;

describe.skipIf(!TEST_DB)("AI 상담: 지식 적재·검색·에이전트 (Postgres + pgvector)", () => {
  let sql: postgres.Sql;
  let ctx: ToolContext;
  beforeAll(async () => {
    sql = await freshDb();
    ctx = { sql, embedder: fakeEmbedder, profile: SUMMER };
  });
  afterAll(() => sql?.end());

  it("바뀐 것만 다시 임베딩한다", async () => {
    const first = await seedKnowledge(sql, fakeEmbedder);
    expect(first.missingEmbeddings).toBe(0);
    expect(first.embedded).toBe(first.products + first.guides);
    expect((await seedKnowledge(sql, fakeEmbedder)).embedded).toBe(0);
    await sql`update guides set content_hash = 'old' where id = 'neutral'`;
    expect((await seedKnowledge(sql, fakeEmbedder)).embedded).toBe(1);
  });

  it("질문 뜻과 내 팔레트 색으로 제품을 고르고, 가격대로 거른다", async () => {
    const hits = await searchProducts(ctx, { query: "차분한 MLBB 모브 립", category: "lip" });
    expect(hits[0].seasons).toContain("summer");
    expect(hits.every((h) => h.category === "lip")).toBe(true);
    const cheap = await searchProducts(ctx, { query: "립", max_price: "under20k" });
    expect(cheap.every((h) => h.priceTier === "under20k")).toBe(true);
  });

  it("에이전트: 검색 → 카드로 보여 주고 발라 보기 → 답", async () => {
    const model = scripted([
      () => [{ functionCall: { name: "search_products", args: { query: "출근용 차분한 로즈", category: "lip" } } }],
      (c) => {
        const id = lastResults(c)[0].id;
        return [
          { functionCall: { name: "show_products", args: { ids: [id, "made-up-id"] } } },
          { functionCall: { name: "try_on", args: { id } } },
        ];
      },
      () => [{ text: "차분한 로즈가 여름 쿨 피부의 핑크기와 잘 맞아요." }],
    ]);
    const events: AdvisorEvent[] = [];
    const { calls } = await runAgent({ model, ctx, history: [{ role: "user", text: "출근용 립 추천해 줘" }], emit: (e) => events.push(e) });
    expect(calls).toBe(3);
    const products = events.find((e) => e.type === "products");
    expect(products && products.type === "products" && products.items.map((i) => i.id)).toHaveLength(1); // 지어낸 id는 빠진다
    expect(events.some((e) => e.type === "tryOn")).toBe(true);
    expect(events.at(-1)).toEqual({ type: "answer", text: "차분한 로즈가 여름 쿨 피부의 핑크기와 잘 맞아요.", mode: "ai" });
    // 시스템 프롬프트 대신 대화엔 사진이 없고, 함수 응답이 모델에 돌아갔다
    expect(model.seen[1].at(-1)!.parts[0].functionResponse?.name).toBe("search_products");
  });

  it("모델이 카드를 안 붙이고 글로만 말해도, 답에 나온 검색 결과를 카드로 붙인다", async () => {
    let named = "";
    const model = scripted([
      () => [{ functionCall: { name: "search_products", args: { query: "모브 로즈 립", category: "lip" } } }],
      (c) => {
        const r = (c.at(-1)!.parts[0].functionResponse!.response as { results: { product: string }[] }).results[0];
        named = r.product;
        return [{ text: `${named}가 잘 어울려요.` }];
      },
    ]);
    const events: AdvisorEvent[] = [];
    await runAgent({ model, ctx, history: [{ role: "user", text: "립 추천" }], emit: (e) => events.push(e) });
    const products = events.find((e) => e.type === "products");
    expect(products?.type === "products" && products.items.map((i) => i.label)).toEqual([named]);
  });

  it("검색하지 않은 제품은 바를 수 없다", async () => {
    const model = scripted([() => [{ functionCall: { name: "try_on", args: { id: "lip-mac-diva" } } }], () => [{ text: "죄송해요" }]]);
    const events: AdvisorEvent[] = [];
    await runAgent({ model, ctx, history: [{ role: "user", text: "디바 발라 줘" }], emit: (e) => events.push(e) });
    expect(events.some((e) => e.type === "tryOn")).toBe(false);
    expect(model.seen[1].at(-1)!.parts[0].functionResponse?.response).toHaveProperty("error");
  });

  it("AI를 못 쓰면 검색만으로 제품을 보여 준다", async () => {
    const events: AdvisorEvent[] = [];
    await runFallback(ctx, [{ role: "user", text: "블러셔 추천" }], (e) => events.push(e));
    const products = events.find((e) => e.type === "products");
    expect(products?.type === "products" && products.items.every((i) => i.category === "blush")).toBe(true);
    expect(events.at(-1)).toMatchObject({ type: "answer", mode: "search" });
  });

  it("하루 호출 수를 센다", async () => {
    expect(await hasBudget(sql)).toBe(true);
    await recordCalls(sql, 3);
    await recordCalls(sql, 2);
    const [row] = await sql`select calls from advisor_usage`;
    expect(row.calls).toBe(5);
  });
});
