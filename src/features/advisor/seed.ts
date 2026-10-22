import { createHash } from "node:crypto";
import type { Sql } from "postgres";
import { hexToLab } from "@/features/analysis/color";
import type { Embedder } from "./gemini";
import { GUIDES } from "./knowledge/guides";
import { describeProduct, PRODUCTS } from "./knowledge/products";

const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const BATCH = 20;

export interface SeedReport {
  products: number;
  guides: number;
  embedded: number;
  missingEmbeddings: number;
}

/**
 * 제품·가이드를 DB에 맞춘다(없어진 건 지우고, 바뀐 건 고친다). 내용 해시가 바뀐 줄만 다시 임베딩해서
 * 무료 임베딩 한도를 아낀다. embedder가 없으면 임베딩 없이 넣고(키워드 검색으로 동작) 나중에 채운다
 */
export async function seedKnowledge(sql: Sql, embedder: Embedder | null): Promise<SeedReport> {
  await sql.begin(async (tx) => {
    for (const p of PRODUCTS) {
      const description = describeProduct(p);
      const lab = hexToLab(p.hex);
      const h = hash(description);
      await tx`
        insert into products (id, category, brand, name, shade, hex, lab_l, lab_a, lab_b, finish, seasons, price_tier, description, content_hash)
        values (${p.id}, ${p.category}, ${p.brand}, ${p.name}, ${p.shade}, ${p.hex}, ${lab.L}, ${lab.a}, ${lab.b}, ${p.finish}, ${p.seasons}, ${p.priceTier}, ${description}, ${h})
        on conflict (id) do update set
          category = excluded.category, brand = excluded.brand, name = excluded.name, shade = excluded.shade, hex = excluded.hex,
          lab_l = excluded.lab_l, lab_a = excluded.lab_a, lab_b = excluded.lab_b, finish = excluded.finish, seasons = excluded.seasons,
          price_tier = excluded.price_tier, description = excluded.description, content_hash = excluded.content_hash,
          embedding = case when products.content_hash = excluded.content_hash then products.embedding else null end
      `;
    }
    await tx`delete from products where not (id = any(${PRODUCTS.map((p) => p.id)}))`;
    for (const g of GUIDES) {
      const h = hash(g.title + g.content);
      await tx`
        insert into guides (id, title, seasons, content, content_hash)
        values (${g.id}, ${g.title}, ${g.seasons}, ${g.content}, ${h})
        on conflict (id) do update set
          title = excluded.title, seasons = excluded.seasons, content = excluded.content, content_hash = excluded.content_hash,
          embedding = case when guides.content_hash = excluded.content_hash then guides.embedding else null end
      `;
    }
    await tx`delete from guides where not (id = any(${GUIDES.map((g) => g.id)}))`;
  });

  let embedded = 0;
  if (embedder) {
    for (const table of ["products", "guides"] as const) {
      const rows = await sql<{ id: string; text: string }[]>`
        select id, ${table === "products" ? sql`description` : sql`title || '. ' || content`} as text from ${sql(table)} where embedding is null
      `;
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        const vectors = await embedder.embed(chunk.map((r) => r.text), "RETRIEVAL_DOCUMENT");
        for (const [j, r] of chunk.entries()) {
          await sql`update ${sql(table)} set embedding = ${`[${vectors[j].join(",")}]`}::vector where id = ${r.id}`;
        }
        embedded += chunk.length;
      }
    }
  }
  const [{ missing }] = await sql<{ missing: number }[]>`
    select ((select count(*) from products where embedding is null) + (select count(*) from guides where embedding is null))::int as missing
  `;
  return { products: PRODUCTS.length, guides: GUIDES.length, embedded, missingEmbeddings: missing };
}
