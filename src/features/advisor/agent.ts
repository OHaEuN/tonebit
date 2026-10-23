import { coupangSearchUrl } from "@/features/recommend/affiliate";
import { SEASON_INFO } from "@/features/recommend/palettes";
import { SUBTYPE_LABEL } from "@/features/analysis/explain";
import type { Finish, PriceTier, ProductCategory } from "@/types/product";
import type { ChatModel, Content, Part } from "./gemini";
import { PRODUCTS } from "./knowledge/products";
import { productForModel, searchGuides, searchProducts, TOOL_DECLARATIONS, type ProductHit, type ToolContext } from "./tools";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export interface ProductCard {
  id: string;
  category: ProductCategory;
  brand: string;
  /** 제품명 + 색 이름 */
  shade: string;
  label: string;
  finish: Finish;
  hex: string;
  priceTier: PriceTier;
  url: string;
}

/** 서버가 브라우저로 흘려보내는 진행 이벤트(NDJSON 한 줄씩) */
export type AdvisorEvent =
  | { type: "status"; text: string }
  | { type: "products"; items: ProductCard[] }
  | { type: "tryOn"; item: ProductCard }
  | { type: "answer"; text: string; mode: "ai" | "search" };

/** 모델을 몇 번까지 부를지. 도구 → 답 두세 번이면 끝나고, 넘으면 멈춘다 */
const MAX_STEPS = 5;

const STATUS: Record<string, (args: Record<string, unknown>) => string> = {
  search_products: (a) => `${a.category === "blush" ? "블러셔" : a.category === "lip" ? "립" : "제품"}을 찾는 중…`,
  search_guides: () => "퍼스널 컬러 가이드를 찾아보는 중…",
  show_products: () => "고른 제품을 정리하는 중…",
  try_on: () => "사진에 발라 보는 중…",
};

function card(id: string): ProductCard | null {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return null;
  return {
    id: p.id,
    category: p.category,
    brand: p.brand,
    shade: `${p.name} ${p.shade}`,
    label: `${p.brand} ${p.name} ${p.shade}`,
    finish: p.finish,
    hex: p.hex,
    priceTier: p.priceTier,
    url: p.url ?? coupangSearchUrl(p.keyword ?? `${p.brand} ${p.name} ${p.shade}`),
  };
}

/**
 * 답 글에 이름이 나온 제품. 브랜드와 색 이름(앞 번호를 뗀 "피치 미"·"코랄" 등)이 둘 다 나와야 센다.
 * "코랄 컬러"처럼 색 이름만 겹치는 일반 낱말에 걸리지 않게 브랜드를 같이 본다
 */
export function mentionedProducts(text: string, hits: ProductHit[], max = 3): ProductHit[] {
  return hits
    .filter((h) => {
      const shade = h.shade.replace(/^\d+\s*/, "").trim();
      return text.includes(h.brand) && (text.includes(h.shade) || (shade.length >= 2 && text.includes(shade)));
    })
    .slice(0, max);
}

export function systemPrompt(ctx: ToolContext): string {
  const { season, subtype, hue, ita, chroma } = ctx.profile;
  const info = SEASON_INFO[season];
  return [
    "너는 퍼스널 컬러 테스트 앱 '톤픽'의 뷰티 상담 도우미야.",
    `이용자 진단: ${info.label} ${info.tone} ${SUBTYPE_LABEL[subtype]} (피부 색상각 ${hue.toFixed(1)}°, 밝기 ITA ${ita.toFixed(1)}°, 채도 ${chroma.toFixed(1)}). 카메라로 재미로 본 결과라 확정 진단처럼 말하지 않는다.`,
    "규칙:",
    "- 한국어 해요체로, 3~5문장 안에서 짧고 구체적으로 답한다. 마크다운 제목·표는 쓰지 않는다.",
    "- 제품은 search_products 결과에 있는 것만 말한다. 없는 제품·가격·성분을 지어내지 않는다.",
    "- 제품을 추천하면 show_products로 고른 id를 최대 3개 보여 준다. 답에서 왜 어울리는지 색 이유를 한 줄씩 말한다.",
    "- 이용자가 발라 달라·보여 달라고 하면 try_on을 부른다. 한 번에 하나.",
    "- 색 이론·피할 색·제형·블러셔 위치처럼 일반 질문은 search_guides로 근거를 찾아 답한다.",
    "- 퍼스널 컬러·메이크업과 상관없는 요청은 정중히 상담 범위를 알려 준다.",
  ].join("\n");
}

interface RunOptions {
  model: ChatModel;
  ctx: ToolContext;
  history: ChatTurn[];
  emit: (e: AdvisorEvent) => void;
}

/** 모델 호출 수(사용량 집계용) */
export interface RunResult {
  calls: number;
}

/**
 * 함수 호출 에이전트 루프. 모델이 도구를 부르면 서버에서 실행해 결과를 돌려주고, 글로 답하면 끝낸다.
 * show_products·try_on은 화면에서 할 일이라 이벤트로 흘려보내고 모델에는 "했다"고만 알린다
 */
export async function runAgent({ model, ctx, history, emit }: RunOptions): Promise<RunResult> {
  const contents: Content[] = history.map((t) => ({ role: t.role === "user" ? "user" : "model", parts: [{ text: t.text }] }));
  const system = systemPrompt(ctx);
  /** 이번 대화에서 검색으로 나온 제품만 보여 주거나 바를 수 있다(모델이 지어낸 id를 막는다) */
  const seen = new Map<string, ProductHit>();
  let shown = false;

  for (let step = 0; step < MAX_STEPS; step++) {
    const reply = await model.generate({ system, contents, tools: TOOL_DECLARATIONS });
    contents.push(reply);
    const calls = reply.parts.filter((p) => p.functionCall);
    if (!calls.length) {
      const text = reply.parts
        .filter((p) => p.text && !p.thought)
        .map((p) => p.text)
        .join("")
        .trim();
      // 모델이 제품을 글로만 말하고 카드(show_products)를 안 붙일 때가 있다. 답에 이름이 나온 검색 결과를 대신 붙인다
      if (!shown) {
        const items = mentionedProducts(text, [...seen.values()])
          .map((h) => card(h.id))
          .filter((c): c is ProductCard => c !== null);
        if (items.length) emit({ type: "products", items });
      }
      emit({ type: "answer", text: text || "음, 답을 정리하지 못했어요. 다르게 물어봐 주세요.", mode: "ai" });
      return { calls: step + 1 };
    }

    const responses: Part[] = [];
    for (const { functionCall } of calls) {
      const { name, args = {} } = functionCall!;
      emit({ type: "status", text: STATUS[name]?.(args) ?? "생각하는 중…" });
      let response: Record<string, unknown>;
      try {
        response = await runTool(name, args);
      } catch (e) {
        response = { error: e instanceof Error ? e.message : "도구 실행 실패" };
      }
      responses.push({ functionResponse: { name, response } });
    }
    contents.push({ role: "user", parts: responses });
  }
  emit({ type: "answer", text: "여기까지 찾아봤어요. 조금 더 구체적으로 물어봐 주면 더 잘 골라 볼게요.", mode: "ai" });
  return { calls: MAX_STEPS };

  async function runTool(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    switch (name) {
      case "search_products": {
        const hits = await searchProducts(ctx, args as Parameters<typeof searchProducts>[1]);
        for (const h of hits) seen.set(h.id, h);
        return { results: hits.map(productForModel) };
      }
      case "search_guides":
        return { results: await searchGuides(ctx, String(args.query ?? "")) };
      case "show_products": {
        const ids = (Array.isArray(args.ids) ? args.ids : []).map(String).filter((id) => seen.has(id)).slice(0, 3);
        const items = ids.map(card).filter((c): c is ProductCard => c !== null);
        if (items.length && !shown) {
          emit({ type: "products", items });
          shown = true;
        }
        return { shown: items.map((c) => c.id) };
      }
      case "try_on": {
        const id = String(args.id ?? "");
        const item = seen.has(id) ? card(id) : null;
        if (!item) return { error: "search_products로 찾은 제품 id만 바를 수 있어요" };
        emit({ type: "tryOn", item });
        return { applied: item.label };
      }
      default:
        return { error: `모르는 도구: ${name}` };
    }
  }
}

/**
 * AI를 못 쓸 때(무료 한도 초과·장애): 마지막 질문으로 검색만 해서 제품을 보여 준다.
 * 그래도 이용자는 빈손으로 돌아가지 않는다
 */
export async function runFallback(ctx: ToolContext, history: ChatTurn[], emit: (e: AdvisorEvent) => void): Promise<void> {
  const question = [...history].reverse().find((t) => t.role === "user")?.text ?? "";
  const category: ProductCategory | undefined = /블러셔|볼/.test(question) ? "blush" : /립|입술|틴트/.test(question) ? "lip" : undefined;
  emit({ type: "status", text: "제품을 찾는 중…" });
  const hits = await searchProducts({ ...ctx, embedder: null }, { query: question, category }, 3);
  const items = hits.map((h) => card(h.id)).filter((c): c is ProductCard => c !== null);
  if (items.length) emit({ type: "products", items });
  emit({
    type: "answer",
    text: items.length
      ? "지금은 AI 상담이 잠깐 쉬고 있어서, 질문과 내 팔레트에 가까운 제품을 골라 왔어요. 조금 뒤에 다시 물어보면 자세히 설명해 드릴게요."
      : "지금은 AI 상담이 잠깐 쉬고 있어요. 조금 뒤에 다시 물어봐 주세요.",
    mode: "search",
  });
}
