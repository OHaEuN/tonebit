import { describe, expect, it } from "vitest";
import { AXIS_KEYS, BASE_WEIGHTS, describePicks, learnWeights, normalize, weightChanges, zeroVector, type Pick } from "./preference";

const sum = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + b, 0);

describe("learnWeights", () => {
  it("선택이 없으면 출발 가중치(합 1) 그대로", () => {
    expect(learnWeights(BASE_WEIGHTS, [])).toEqual(normalize(BASE_WEIGHTS));
  });

  it("색 방향을 늘 따르는 선택 일곱 번이면 색 방향 가중치가 오르고 나머지는 내리되, 한 항목이 다 먹지는 않는다", () => {
    const pick: Pick = { winner: { ...zeroVector(), undertone: 1, lightness: -0.5 }, loser: { ...zeroVector(), undertone: -1, lightness: 0.5 } };
    const w = learnWeights(BASE_WEIGHTS, Array(7).fill(pick));
    const base = normalize(BASE_WEIGHTS);
    expect(w.undertone).toBeGreaterThan(base.undertone + 0.08);
    expect(w.lightness).toBeLessThan(base.lightness);
    expect(w.undertone).toBeLessThan(0.6);
    expect(sum(w)).toBeCloseTo(1, 6);
    for (const k of AXIS_KEYS) expect(w[k]).toBeGreaterThanOrEqual(0);
  });

  it("한 항목을 늘 거스르는 선택이 쌓여도 그 항목은 출발값의 1/4 아래로 내려가지 않는다", () => {
    const pick: Pick = { winner: { ...zeroVector(), texture: -1, impression: -1 }, loser: { ...zeroVector(), texture: 1, impression: 1 } };
    const w = learnWeights(BASE_WEIGHTS, Array(14).fill(pick));
    expect(w.texture).toBeGreaterThan(0);
    expect(w.impression).toBeGreaterThan(0);
    expect(w.texture).toBeGreaterThanOrEqual(0.25 * normalize(BASE_WEIGHTS).texture * 0.9);
  });

  it("서로 반대되는 선택이면 그 항목은 조금 내려갈 뿐 출발값 근처에 남는다", () => {
    const a: Pick = { winner: { ...zeroVector(), chroma: 1 }, loser: { ...zeroVector(), chroma: -1 } };
    const b: Pick = { winner: a.loser, loser: a.winner };
    const w = learnWeights(BASE_WEIGHTS, [a, b, a, b]);
    const base = normalize(BASE_WEIGHTS).chroma;
    expect(w.chroma).toBeLessThanOrEqual(base);
    expect(w.chroma).toBeGreaterThan(base - 0.08);
  });
});

describe("describePicks", () => {
  it("이긴 쪽이 늘 더 진하고 차분하면 그렇게 말하고, 생김새가 없으면 아무 말도 안 한다", () => {
    const pick: Pick = {
      winner: zeroVector(),
      loser: zeroVector(),
      winnerTraits: { lightnessGap: 18, chromaGap: -6, hueGap: 2 },
      loserTraits: { lightnessGap: 10, chromaGap: 4, hueGap: 0 },
    };
    expect(describePicks([pick, pick, pick])).toEqual(["더 진한 색", "더 차분한 색"]);
    expect(describePicks([{ winner: zeroVector(), loser: zeroVector() }])).toEqual([]);
  });
});

describe("weightChanges", () => {
  it("많이 움직인 항부터 최대 셋, 15% 미만 변화는 뺀다", () => {
    const learned = { ...BASE_WEIGHTS, undertone: BASE_WEIGHTS.undertone * 1.6, chroma: BASE_WEIGHTS.chroma * 0.5, redness: BASE_WEIGHTS.redness * 1.05 };
    const changes = weightChanges(BASE_WEIGHTS, learned);
    expect(changes[0].key).toBe("chroma");
    expect(changes.map((c) => c.key)).not.toContain("redness");
    expect(changes.length).toBeLessThanOrEqual(3);
  });
});
