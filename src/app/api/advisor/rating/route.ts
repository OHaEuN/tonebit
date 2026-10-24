import { revalidateTag } from "next/cache";
import { createRateLimiter } from "@/features/advisor/request";
import { parseRating } from "@/features/feedback/reactions";
import { ACCURACY_TAG } from "@/features/feedback/stats";
import { appendRating, feedbackEnabled } from "@/features/feedback/store";

const allow = createRateLimiter(30);

/** AI 상담 답에 대한 "도움이 됐어요 / 아쉬워요". 질문·답 글은 받지 않는다 */
export async function POST(request: Request) {
  if (!feedbackEnabled()) return Response.json({ error: "disabled" }, { status: 503 });
  if (!allow(request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local")) return Response.json({ error: "rate" }, { status: 429 });
  const text = await request.text();
  if (text.length > 1000) return Response.json({ error: "too large" }, { status: 413 });
  let rating: ReturnType<typeof parseRating> = null;
  try {
    rating = parseRating(JSON.parse(text));
  } catch {
    rating = null;
  }
  if (!rating) return Response.json({ error: "invalid" }, { status: 400 });
  try {
    await appendRating(rating);
  } catch {
    return Response.json({ error: "store failed" }, { status: 502 });
  }
  // "max"(옛 값을 주며 뒤에서 다시 계산)는 그 계산이 도는 동안 들어온 전문가 진단을 옛 숫자로 덮어 몇 시간 남길 수 있다.
  // 집계는 SQL 한 번이라 바로 비운다
  revalidateTag(ACCURACY_TAG, { expire: 0 });
  return Response.json({ ok: true });
}
