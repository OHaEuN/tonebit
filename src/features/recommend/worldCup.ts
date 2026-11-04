import { hexToLab } from "@/features/analysis/color";

/** 토너먼트 인원. 16강부터 네 번 이기면 우승 */
export const BRACKET_SIZE = 16;
/** 후보끼리 이보다 가까운 색(Lab 거리)은 비교해도 차이가 안 보여서 뺀다 */
const MIN_COLOR_DISTANCE = 7;

const distance = (a: string, b: string) => {
  const x = hexToLab(a);
  const y = hexToLab(b);
  return Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b);
};

/**
 * 순위 상위에서 서로 다른 색 16개를 고른다. 위에서부터 훑으며 이미 고른 색과 충분히 떨어진 것만 넣고,
 * 그래도 모자라면 남은 상위 색으로 채운다
 */
export function pickContenders<T extends { hex: string }>(ranked: T[], size = BRACKET_SIZE): T[] {
  const picked: T[] = [];
  for (const item of ranked) {
    if (picked.length >= size) break;
    if (picked.every((p) => distance(p.hex, item.hex) >= MIN_COLOR_DISTANCE)) picked.push(item);
  }
  for (const item of ranked) {
    if (picked.length >= size) break;
    if (!picked.includes(item)) picked.push(item);
  }
  return picked;
}

/** Fisher–Yates. 대진을 섞어 순위 순서가 결과에 묻어나지 않게 한다 */
export function shuffle<T>(items: T[], random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface Bracket {
  /** 이번 라운드에서 아직 붙지 않은 순서. 앞의 둘이 지금 대결 */
  queue: string[];
  /** 이번 라운드 승자 */
  winners: string[];
  /** 이번 라운드 시작 인원 */
  roundSize: number;
}

export function startBracket(ids: string[]): Bracket {
  return { queue: ids, winners: [], roundSize: ids.length };
}

export function currentMatch(b: Bracket): [string, string] | null {
  return b.queue.length >= 2 ? [b.queue[0], b.queue[1]] : null;
}

/** 다 붙었으면 우승자 */
export function champion(b: Bracket): string | null {
  return b.queue.length === 1 && b.winners.length === 0 ? b.queue[0] : null;
}

export function pickWinner(b: Bracket, id: string): Bracket {
  const winners = [...b.winners, id];
  let queue = b.queue.slice(2);
  // 홀수면 남은 하나는 부전승
  if (queue.length === 1) {
    winners.push(queue[0]);
    queue = [];
  }
  if (queue.length > 0) return { queue, winners, roundSize: b.roundSize };
  return { queue: winners, winners: [], roundSize: winners.length };
}

const ROUND_LABEL: Record<number, string> = { 4: "준결승", 2: "결승" };

/** "16강 3/8"처럼 지금 라운드와 몇 번째 대결인지 */
export function matchLabel(b: Bracket): string {
  const name = ROUND_LABEL[b.roundSize] ?? `${b.roundSize}강`;
  const total = Math.ceil(b.roundSize / 2);
  return total > 1 ? `${name} ${b.winners.length + 1}/${total}` : name;
}

/** 전체 대결 수 대비 끝난 대결 수(0~1). 앞 라운드에서 떨어진 수가 곧 끝난 대결 수다 */
export function progress(b: Bracket, size: number): number {
  return Math.min(1, (size - b.roundSize + b.winners.length) / (size - 1));
}
