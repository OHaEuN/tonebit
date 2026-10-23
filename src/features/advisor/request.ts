import { SEASON_SUBTYPES } from "@/features/analysis/tone";
import type { Season, Subtype } from "@/types/analysis";
import type { ChatTurn } from "./agent";
import type { Profile } from "./tools";

export interface AdvisorRequest {
  history: ChatTurn[];
  profile: Profile;
}

export const MAX_TURNS = 12;
export const MAX_CHARS = 400;

const SEASONS = Object.keys(SEASON_SUBTYPES) as Season[];
const finite = (v: unknown, lo: number, hi: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

/** 요청 본문을 검사한다. 대화는 최근 MAX_TURNS개만, 글자 수는 잘라 쓴다. 마지막은 이용자 말이어야 한다 */
export function parseAdvisorRequest(body: unknown): AdvisorRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const p = b.profile as Record<string, unknown> | undefined;
  if (!p || !SEASONS.includes(p.season as Season)) return null;
  const season = p.season as Season;
  if (!SEASON_SUBTYPES[season].includes(p.subtype as Subtype)) return null;
  if (!finite(p.hue, 0, 360) || !finite(p.ita, -90, 90) || !finite(p.chroma, 0, 150)) return null;
  if (!Array.isArray(b.history) || b.history.length === 0) return null;
  const history: ChatTurn[] = [];
  for (const t of b.history.slice(-MAX_TURNS)) {
    if (!t || typeof t !== "object") return null;
    const { role, text } = t as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof text !== "string" || !text.trim()) return null;
    history.push({ role, text: text.trim().slice(0, MAX_CHARS) });
  }
  if (history.at(-1)!.role !== "user") return null;
  return { history, profile: { season, subtype: p.subtype as Subtype, hue: p.hue, ita: p.ita, chroma: p.chroma } };
}

/**
 * 아주 단순한 IP별 분당 제한. 서버리스 인스턴스마다 따로 세서 완벽하진 않지만 한 사람이 무료 한도를 다 쓰는 걸 막는다.
 * 전체 하루 한도는 DB(advisor_usage)가 지킨다
 */
export function createRateLimiter(perMinute: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return (key: string): boolean => {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((x) => t - x < 60_000);
    if (recent.length >= perMinute) {
      hits.set(key, recent);
      return false;
    }
    recent.push(t);
    hits.set(key, recent);
    if (hits.size > 5000) hits.clear();
    return true;
  };
}
