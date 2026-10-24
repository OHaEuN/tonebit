import { getAccuracyStats } from "@/features/feedback/stats";

/** 결과 화면의 "지금까지 몇 명이 알려 줬는지" 한 줄. 정확도 페이지와 같은 캐시를 쓰고, 새 진단이 들어오면 함께 비워진다 */
export async function GET() {
  const stats = await getAccuracyStats();
  if (!stats) return Response.json({ error: "disabled" }, { status: 404 });
  return Response.json(stats.total);
}
