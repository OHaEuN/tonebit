import type { ReferenceSource } from "@/types/analysis";

export type Verdict = "agree" | "unsure" | "disagree";

export interface ResultReaction {
  verdict: Verdict;
  predicted: string;
  reference: ReferenceSource;
  source: "camera" | "image";
  shots: number;
}

export interface AdvisorRating {
  helpful: boolean;
  mode: "ai" | "search";
  products: string[];
}

const VERDICTS: Verdict[] = ["agree", "unsure", "disagree"];
const REFERENCES: ReferenceSource[] = ["white", "locked", "teeth", "sclera", "scene", "none"];
const SLUG = /^(spring|summer|autumn|winter)-(light|bright|true|soft|deep)$/;
/** products.json의 id 꼴: lip-브랜드-라인-호수. 브랜드·라인이 한글이고 호수에 대문자(N20, B07)가 섞인다 */
const PRODUCT_ID = /^[A-Za-z0-9가-힣-]{1,64}$/;

/** 결과 반응 본문 검사. 필요한 필드만 골라낸다 */
export function parseReaction(body: unknown): ResultReaction | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (!VERDICTS.includes(b.verdict as Verdict)) return null;
  if (typeof b.predicted !== "string" || !SLUG.test(b.predicted)) return null;
  if (!REFERENCES.includes(b.reference as ReferenceSource)) return null;
  if (b.source !== "camera" && b.source !== "image") return null;
  if (typeof b.shots !== "number" || !Number.isInteger(b.shots) || b.shots < 1 || b.shots > 10) return null;
  return { verdict: b.verdict as Verdict, predicted: b.predicted, reference: b.reference as ReferenceSource, source: b.source, shots: b.shots };
}

/** AI 상담 평가 본문 검사 */
export function parseRating(body: unknown): AdvisorRating | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.helpful !== "boolean") return null;
  if (b.mode !== "ai" && b.mode !== "search") return null;
  const products = Array.isArray(b.products) ? b.products : [];
  if (products.length > 3 || !products.every((p) => typeof p === "string" && PRODUCT_ID.test(p))) return null;
  return { helpful: b.helpful, mode: b.mode, products: products as string[] };
}
