import type { Sql } from "postgres";
import { hexToLab } from "@/features/analysis/color";
import { SEASON_INFO } from "@/features/recommend/palettes";
import type { Lab, Season, Subtype } from "@/types/analysis";
import type { PriceTier, ProductCategory } from "@/types/product";
import type { Embedder, FunctionDeclaration } from "./gemini";
import { PRICE_KO } from "./knowledge/products";

/** 클라이언트가 보낸 진단 요약. 숫자만 있고 사진은 없다 */
export interface Profile {
  season: Season;
  subtype: Subtype;
  hue: number;
  ita: number;
  chroma: number;
}

export interface ProductHit {
  id: string;
  category: ProductCategory;
  brand: string;
  name: string;
  shade: string;
  hex: string;
  finish: string;
  seasons: Season[];
  priceTier: PriceTier;
  description: string;
  /** 0~1. 질문과의 의미 유사도(벡터)와 내 팔레트와의 색 거리를 합친 점수 */
  score: number;
}

export interface GuideHit {
  id: string;
  title: string;
  content: string;
}

export interface ToolContext {
  sql: Sql;
  /** 없거나 실패하면 키워드 검색으로 내려간다 */
  embedder: Embedder | null;
  profile: Profile;
}

const TIERS: PriceTier[] = ["under20k", "20k-40k", "over40k"];
const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "search_products",
    description:
      "톤빛 제품 DB에서 립·블러셔를 찾는다. 질문과 의미가 가까운 제품을 찾고, 이용자 퍼스널 컬러 팔레트와 색이 가까울수록 위로 올린다. 제품을 추천하기 전에 반드시 부른다.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "원하는 느낌·상황·색 (예: 출근용 차분한 로즈, MLBB, 선명한 레드)" },
        category: { type: "string", enum: ["lip", "blush"], description: "립이나 블러셔. 모르면 비운다" },
        max_price: { type: "string", enum: TIERS, description: "가격대 상한. under20k=2만원 이하, 20k-40k=4만원 이하" },
        finish: { type: "string", enum: ["matte", "glossy", "velvet", "powder", "liquid"], description: "제형" },
        season: { type: "string", enum: SEASONS, description: "다른 시즌 색을 보고 싶을 때만. 기본은 이용자 시즌" },
      },
    },
  },
  {
    name: "search_guides",
    description: "퍼스널 컬러 가이드 문서에서 질문에 답할 근거를 찾는다(어울리는 색·피할 색·제형·블러셔 위치·조명 등).",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "찾을 내용" } },
      required: ["query"],
    },
  },
  {
    name: "try_on",
    description: "이용자 사진에 제품 색을 바로 발라 보여 준다. 이용자가 발라 달라·보여 달라고 할 때 부른다. search_products 결과의 id만 쓴다.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
];

const toVector = (v: number[]) => `[${v.join(",")}]`;

/** CIE76 색차. 팔레트와의 거리라 이 정도 정밀도면 충분하다 */
const deltaE = (a: Lab, b: Lab) => Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b);

/** 내 시즌 팔레트 중 가장 가까운 색과의 거리로 0~1 점수(ΔE 0 → 1, 20 → 0.37) */
export function paletteFit(hex: string, season: Season, category: ProductCategory): number {
  const palette = category === "lip" ? SEASON_INFO[season].lips : SEASON_INFO[season].blushes;
  const lab = hexToLab(hex);
  const d = Math.min(...palette.map((s) => deltaE(lab, hexToLab(s.hex))));
  return Math.exp(-d / 20);
}

async function embedQuery(ctx: ToolContext, query: string): Promise<number[] | null> {
  if (!ctx.embedder || !query.trim()) return null;
  try {
    return (await ctx.embedder.embed([query], "RETRIEVAL_QUERY"))[0];
  } catch {
    return null;
  }
}

/** 임베딩을 못 쓸 때: 질문 낱말이 설명에 몇 개 들어 있는지 */
function keywordScore(text: string, query: string): number {
  const words = query.split(/[\s,.!?·]+/).filter((w) => w.length >= 2);
  if (!words.length) return 0;
  return words.filter((w) => text.includes(w)).length / words.length;
}

export async function searchProducts(
  ctx: ToolContext,
  args: { query?: string; category?: ProductCategory; max_price?: PriceTier; finish?: string; season?: Season },
  limit = 5,
): Promise<ProductHit[]> {
  const season = args.season && SEASONS.includes(args.season) ? args.season : ctx.profile.season;
  const tiers = args.max_price && TIERS.includes(args.max_price) ? TIERS.slice(0, TIERS.indexOf(args.max_price) + 1) : null;
  const vec = await embedQuery(ctx, args.query ?? "");
  const rows = await ctx.sql<(Omit<ProductHit, "score" | "priceTier"> & { price_tier: PriceTier; similarity: number | null })[]>`
    select id, category, brand, name, shade, hex, finish, seasons, price_tier, description,
      ${vec ? ctx.sql`1 - (embedding <=> ${toVector(vec)}::vector)` : ctx.sql`null::float`} as similarity
    from products
    where (${args.category ?? null}::text is null or category = ${args.category ?? null})
      and (${tiers}::text[] is null or price_tier = any(${tiers}))
      and (${args.finish ?? null}::text is null or finish = ${args.finish ?? null})
    order by similarity desc nulls last
    limit 40
  `;
  return rows
    .map(({ price_tier, similarity, ...r }) => {
      const meaning = similarity !== null ? similarity : keywordScore(r.description, args.query ?? "");
      const fit = paletteFit(r.hex, season, r.category);
      const seasonBonus = r.seasons.includes(season) ? 0.15 : 0;
      return { ...r, priceTier: price_tier, score: Math.min(1, 0.5 * meaning + 0.35 * fit + seasonBonus) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function searchGuides(ctx: ToolContext, query: string, limit = 3): Promise<GuideHit[]> {
  const vec = await embedQuery(ctx, query);
  const season = ctx.profile.season;
  const rows = await ctx.sql<(GuideHit & { similarity: number | null })[]>`
    select id, title, content,
      ${vec ? ctx.sql`1 - (embedding <=> ${toVector(vec)}::vector)` : ctx.sql`null::float`} as similarity
    from guides
    where cardinality(seasons) = 0 or ${season} = any(seasons)
  `;
  return rows
    .map((r) => ({ ...r, rank: r.similarity ?? keywordScore(r.title + " " + r.content, query) }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map(({ id, title, content }) => ({ id, title, content }));
}

/** 모델에 돌려줄 때는 필요한 것만 짧게 */
export function productForModel(p: ProductHit) {
  return { id: p.id, product: `${p.brand} ${p.name} ${p.shade}`, category: p.category, price: PRICE_KO[p.priceTier], description: p.description, fit: Math.round(p.score * 100) / 100 };
}
