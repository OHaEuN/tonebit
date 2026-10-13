/**
 * 피드백 저장소: Upstash Redis REST API. SDK 없이 fetch로 부른다.
 * Vercel 마켓플레이스에서 Upstash를 연결하면 KV_REST_API_URL·KV_REST_API_TOKEN이 생긴다(직접 만들면 UPSTASH_REDIS_REST_*)
 */
const KEY = "tonepick:feedback";

function config(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export function feedbackEnabled(): boolean {
  return config() !== null;
}

async function command(args: (string | number)[]): Promise<unknown> {
  const c = config();
  if (!c) throw new Error("feedback store not configured");
  const res = await fetch(c.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

export async function appendFeedback(entry: object): Promise<void> {
  await command(["RPUSH", KEY, JSON.stringify({ ...entry, at: new Date().toISOString().slice(0, 10) })]);
}

export async function readFeedback(): Promise<unknown[]> {
  const rows = (await command(["LRANGE", KEY, 0, -1])) as string[];
  return rows.map((r) => JSON.parse(r));
}
