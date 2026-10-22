import { runAgent, runFallback, type AdvisorEvent } from "@/features/advisor/agent";
import { gemini, geminiEnabled } from "@/features/advisor/gemini";
import { createRateLimiter, parseAdvisorRequest } from "@/features/advisor/request";
import { hasBudget, recordCalls } from "@/features/advisor/usage";
import { db, dbEnabled } from "@/lib/db";

const allow = createRateLimiter(8);

/**
 * AI 뷰티 상담. 진단 숫자와 대화만 받는다(사진은 받지 않는다). 진행 상황을 NDJSON으로 흘려보내서
 * "립을 찾는 중…" 같은 단계가 바로바로 보인다. AI를 못 쓰면(한도·장애) 검색만으로 답한다
 */
export async function POST(request: Request) {
  if (!dbEnabled()) return Response.json({ error: "disabled" }, { status: 503 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!allow(ip)) return Response.json({ error: "rate" }, { status: 429 });
  const text = await request.text();
  if (text.length > 8000) return Response.json({ error: "too large" }, { status: 413 });
  let parsed: ReturnType<typeof parseAdvisorRequest> = null;
  try {
    parsed = parseAdvisorRequest(JSON.parse(text));
  } catch {
    parsed = null;
  }
  if (!parsed) return Response.json({ error: "invalid" }, { status: 400 });
  const { history, profile } = parsed;

  const sql = db();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: AdvisorEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      const ctx = { sql, embedder: geminiEnabled() ? gemini : null, profile };
      try {
        if (geminiEnabled() && (await hasBudget(sql))) {
          try {
            const { calls } = await runAgent({ model: gemini, ctx, history, emit });
            await recordCalls(sql, calls);
          } catch (e) {
            console.error("advisor agent", e);
            await runFallback(ctx, history, emit);
          }
        } else {
          await runFallback(ctx, history, emit);
        }
      } catch (e) {
        console.error("advisor", e);
        emit({ type: "answer", text: "지금은 답을 드리기 어려워요. 잠시 뒤에 다시 물어봐 주세요.", mode: "search" });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
