import { parseFeedback } from "@/features/feedback/schema";
import { appendFeedback, feedbackEnabled, readFeedback } from "@/features/feedback/store";

/** 이용자가 동의하고 보낸 진단 결과 한 건을 저장한다. 사진은 받지 않는다 */
export async function POST(request: Request) {
  if (!feedbackEnabled()) return Response.json({ error: "disabled" }, { status: 503 });
  const text = await request.text();
  if (text.length > 2000) return Response.json({ error: "too large" }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  const entry = parseFeedback(body);
  if (!entry) return Response.json({ error: "invalid" }, { status: 400 });
  try {
    await appendFeedback(entry);
  } catch {
    return Response.json({ error: "store failed" }, { status: 502 });
  }
  return Response.json({ ok: true });
}

/** 기준선 보정용으로 모은 데이터를 내려받는다. FEEDBACK_ADMIN_TOKEN이 있어야 한다 */
export async function GET(request: Request) {
  const token = process.env.FEEDBACK_ADMIN_TOKEN;
  if (!token || request.headers.get("authorization") !== `Bearer ${token}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!feedbackEnabled()) return Response.json({ error: "disabled" }, { status: 503 });
  return Response.json(await readFeedback());
}
