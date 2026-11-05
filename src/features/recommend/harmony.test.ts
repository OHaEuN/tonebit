import { describe, expect, it } from "vitest";
import type { Lab, Season, Subtype } from "@/types/analysis";
import type { ProductSource } from "@/types/product";
import { faceAxes, harmonyBreakdown, harmonyNote, harmonyPrior, hueDeg, onLipColor, ouLuoHarmony, rankLips, toTrueLab, type HarmonyItem } from "./harmony";
import products from "./products.json";
import { trendScore } from "./trend";

/** 실제 색 공간의 피부와 맨입술 */
const SKIN: Lab = { L: 62, a: 14, b: 19 };
const BARE: Lab = { L: 49.6, a: 20.7, b: 15.6 };
const even: Record<Season, number> = { spring: 0.25, summer: 0.25, autumn: 0.25, winter: 0.25 };
const warm: Record<Season, number> = { spring: 0.7, summer: 0.1, autumn: 0.15, winter: 0.05 };
const cool: Record<Season, number> = { spring: 0.1, summer: 0.7, autumn: 0.05, winter: 0.15 };

/** 피부에서 밝기와 색상각(실제 색 공간, 0°가 빨강)을 정한 입술 위 색 */
function lipAt(dL: number, hue: number, c = 36): Lab {
  const h = hue * (Math.PI / 180);
  return { L: SKIN.L - dL, a: c * Math.cos(h), b: c * Math.sin(h) };
}

const ITEMS: HarmonyItem[] = (products as ProductSource[])
  .filter((p) => p.category === "lip")
  .map((p) => ({ id: p.id, name: `${p.brand} ${p.name} ${p.shade}`, hex: p.hex, finish: p.finish, seasons: p.seasons, trend: trendScore(p) }));

describe("faceAxes", () => {
  const prior = harmonyPrior(SKIN, BARE, even, { subtype: "true" });

  it("립이 피부보다 밝거나 같으면 밝기 항이 음수, 최적 차이면 1에 가깝다", () => {
    const at = (dL: number) => faceAxes(SKIN, lipAt(dL, prior.hueOptimum), prior).axes.lightness;
    expect(at(-5)).toBeLessThan(0);
    expect(at(0)).toBeLessThan(0);
    expect(at(prior.lightnessOptimum)).toBeGreaterThan(0.95);
    expect(at(prior.lightnessOptimum + 30)).toBeLessThan(at(prior.lightnessOptimum + 10));
  });

  it("색 방향은 최적 색상각에서 멀어질수록 깎이고, 보라 쪽은 더 깎는다", () => {
    const at = (hue: number) => faceAxes(SKIN, lipAt(14, hue), prior).axes.undertone;
    expect(at(prior.hueOptimum)).toBeGreaterThan(0.95);
    expect(at(prior.hueOptimum + 30)).toBeLessThan(0);
    expect(at(-30)).toBeLessThan(at(prior.hueOptimum - 30));
    expect(at(-30)).toBeLessThan(-0.9);
  });

  it("선명도는 이 사람에게 맞는 채도에서 1, 너무 선명하거나 흐리면 깎인다", () => {
    const at = (c: number) => faceAxes(SKIN, lipAt(14, prior.hueOptimum, c), prior).axes.chroma;
    const opt = prior.chromaOptimum;
    expect(at(opt)).toBeGreaterThan(0.95);
    expect(at(opt)).toBeGreaterThan(at(opt + 30));
    expect(at(opt)).toBeGreaterThan(at(Math.max(0, opt - 25)));
  });

  it("혈색은 입술 붉은기가 피부보다 높을수록 커진다", () => {
    const h = prior.hueOptimum;
    expect(faceAxes(SKIN, lipAt(14, h, 50), prior).axes.redness).toBeGreaterThan(faceAxes(SKIN, lipAt(14, h, 20), prior).axes.redness);
  });

  it("치아 항은 차갑고 선명한 립이 높고 누드가 낮다", () => {
    expect(faceAxes(SKIN, lipAt(18, 0, 45), prior).axes.teeth).toBeGreaterThan(faceAxes(SKIN, lipAt(6, 35, 15), prior).axes.teeth);
  });
});

describe("harmonyPrior", () => {
  it("웜 확률이 높으면 최적 색상각이 오렌지 쪽, 쿨이면 핑크 쪽이다", () => {
    expect(harmonyPrior(SKIN, BARE, warm).hueOptimum).toBeGreaterThan(harmonyPrior(SKIN, BARE, cool).hueOptimum + 8);
  });

  it("딥은 라이트보다 진한 립이, 브라이트는 뮤트보다 선명한 립이 최적이다", () => {
    const at = (subtype: Subtype) => harmonyPrior(SKIN, BARE, even, { subtype });
    expect(at("deep").lightnessOptimum).toBeGreaterThan(at("light").lightnessOptimum + 6);
    expect(at("bright").chromaOptimum).toBeGreaterThan(at("soft").chromaOptimum + 10);
  });

  it("자연 대비가 큰 사람(눈썹이 피부보다 훨씬 어두움)은 더 진한 립이 최적이 된다", () => {
    const high = harmonyPrior(SKIN, BARE, even, { brow: { L: SKIN.L - 45, a: 5, b: 8 } });
    const low = harmonyPrior(SKIN, BARE, even, { brow: { L: SKIN.L - 15, a: 5, b: 8 } });
    expect(high.lightnessOptimum).toBeGreaterThan(low.lightnessOptimum);
    expect(high.naturalContrast).toBe(45);
    expect(harmonyPrior(SKIN, BARE, even).naturalContrast).toBeUndefined();
  });

  it("취향이 '또렷하고 매혹적인'이면 '자연스럽고 세련된'보다 진하고 선명한 립이 최적이다", () => {
    const bold = harmonyPrior(SKIN, BARE, even, { taste: { feel: "bold" } });
    const natural = harmonyPrior(SKIN, BARE, even, { taste: { feel: "natural" } });
    expect(bold.lightnessOptimum).toBeGreaterThan(natural.lightnessOptimum);
    expect(bold.chromaOptimum).toBeGreaterThan(natural.chromaOptimum);
  });
});

describe("ouLuoHarmony", () => {
  it("밝기 차이가 15 이상인 쌍이 거의 같은 밝기의 쌍보다 조화롭다", () => {
    const base: Lab = { L: 62, a: 14, b: 19 };
    expect(ouLuoHarmony(base, { L: 45, a: 30, b: 10 })).toBeGreaterThan(ouLuoHarmony(base, { L: 60, a: 30, b: 10 }));
  });
  it("색이 서로 비슷한 쌍이 채도·색상이 크게 다른 쌍보다 조화롭다", () => {
    const base: Lab = { L: 62, a: 14, b: 19 };
    expect(ouLuoHarmony(base, { L: 47, a: 18, b: 16 })).toBeGreaterThan(ouLuoHarmony(base, { L: 47, a: 60, b: -20 }));
  });
});

describe("rankLips", () => {
  const skin: Lab = { L: 53, a: 12, b: 16 };
  const lip: Lab = { L: 42, a: 20, b: 11 };

  it("웜 얼굴의 상위 5개는 쿨 얼굴의 상위 5개보다 따뜻한(색상각 큰) 색이고, 겹치는 제품이 한 개 이하다", () => {
    const top = (odds: Record<Season, number>, subtype: Subtype) => rankLips(skin, lip, odds, ITEMS, { subtype }).slice(0, 5);
    const warmTop = top(warm, "bright");
    const coolTop = top(cool, "soft");
    const meanHue = (r: typeof warmTop) => r.reduce((s, x) => s + hueDeg(onLipColor(x.item.hex, lip, 0.68)), 0) / r.length;
    expect(meanHue(warmTop)).toBeGreaterThan(meanHue(coolTop) + 6);
    const overlap = warmTop.filter((w) => coolTop.some((c) => c.item.id === w.item.id)).length;
    expect(overlap).toBeLessThanOrEqual(1);
  });

  it("딥 타입의 1등은 라이트 타입의 1등보다 어둡다", () => {
    const deep = rankLips({ ...skin, L: 46 }, { ...lip, L: 36 }, { spring: 0.1, summer: 0.1, autumn: 0.3, winter: 0.5 }, ITEMS, { subtype: "deep" })[0];
    const light = rankLips({ ...skin, L: 60 }, { ...lip, L: 48 }, { spring: 0.5, summer: 0.3, autumn: 0.1, winter: 0.1 }, ITEMS, { subtype: "light" })[0];
    expect(onLipColor(deep.item.hex, lip, 0.68).L).toBeLessThan(onLipColor(light.item.hex, lip, 0.68).L);
  });

  it("12타입 전체에서 1등이 최소 여섯 가지이고 상위 5개 합집합이 20개 이상이며 100점은 없다", () => {
    const types: [Record<Season, number>, Subtype, number][] = [
      [{ spring: 0.6, summer: 0.3, autumn: 0.05, winter: 0.05 }, "light", 62],
      [{ spring: 0.7, summer: 0.1, autumn: 0.1, winter: 0.1 }, "bright", 58],
      [{ spring: 0.6, summer: 0.1, autumn: 0.3, winter: 0 }, "true", 56],
      [{ spring: 0.3, summer: 0.6, autumn: 0.05, winter: 0.05 }, "light", 62],
      [{ spring: 0.1, summer: 0.7, autumn: 0.1, winter: 0.1 }, "soft", 57],
      [{ spring: 0.05, summer: 0.65, autumn: 0, winter: 0.3 }, "true", 56],
      [{ spring: 0.05, summer: 0.05, autumn: 0.6, winter: 0.3 }, "deep", 47],
      [{ spring: 0.2, summer: 0.1, autumn: 0.6, winter: 0.1 }, "soft", 52],
      [{ spring: 0.3, summer: 0, autumn: 0.65, winter: 0.05 }, "true", 52],
      [{ spring: 0, summer: 0.1, autumn: 0.3, winter: 0.6 }, "deep", 46],
      [{ spring: 0.1, summer: 0.1, autumn: 0.1, winter: 0.7 }, "bright", 52],
      [{ spring: 0.05, summer: 0.3, autumn: 0, winter: 0.65 }, "true", 51],
    ];
    const tops = types.map(([odds, subtype, L]) => rankLips({ ...skin, L }, { ...lip, L: L - 11 }, odds, ITEMS, { subtype }).slice(0, 5));
    expect(new Set(tops.map((t) => t[0].item.id)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(tops.flat().map((r) => r.item.id)).size).toBeGreaterThanOrEqual(20);
    for (const t of tops) expect(t[0].score).toBeLessThan(100);
  });

  it("점수가 0~100이고 중앙값이 35~72 사이다", () => {
    const scores = rankLips(skin, lip, even, ITEMS, { subtype: "true" }).map((r) => r.score);
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
    const median = [...scores].sort((a, b) => a - b)[Math.floor(scores.length / 2)];
    expect(median).toBeGreaterThanOrEqual(35);
    expect(median).toBeLessThanOrEqual(72);
  });

  it("취향을 답하면 인상·질감 항이 생기고, 촉촉한 질감을 고르면 글로시 제품이 올라간다", () => {
    const plain = rankLips(skin, lip, even, ITEMS, { subtype: "true" });
    const glossy = rankLips(skin, lip, even, ITEMS, { subtype: "true", taste: { feel: "vivid", texture: "glossy" } });
    expect(harmonyBreakdown(plain[0]).map((a) => a.key)).toEqual(["lightness", "undertone", "redness", "chroma", "harmony", "fit", "trend", "teeth"]);
    expect(harmonyBreakdown(glossy[0]).map((a) => a.key)).toContain("texture");
    expect(harmonyBreakdown(glossy[0]).map((a) => a.key)).toContain("impression");
    const glossyShare = (r: typeof plain) => r.slice(0, 10).filter((x) => x.item.finish === "glossy").length;
    expect(glossyShare(glossy)).toBeGreaterThanOrEqual(glossyShare(plain));
  });

  it("항목별 값은 0~1이다", () => {
    for (const a of harmonyBreakdown(rankLips(skin, lip, even, ITEMS, { subtype: "true" })[3])) {
      expect(a.value).toBeGreaterThanOrEqual(0);
      expect(a.value).toBeLessThanOrEqual(1);
    }
  });
});

describe("onLipColor", () => {
  it("덮는 정도가 클수록 제품 색에 가깝고, 얼굴에 그릴 때와 같은 이동이라 밝기는 60%만 간다", () => {
    const full = onLipColor("#C8283E", BARE, 1);
    const sheer = onLipColor("#C8283E", BARE, 0.3);
    expect(full.a).toBeGreaterThan(sheer.a);
    expect(full.L).toBeLessThan(sheer.L);
    expect(full.L).toBeGreaterThan(40);
  });
});

describe("harmonyNote", () => {
  it("웜 얼굴에 차가운 핑크를 올리면 색 방향 경고, 최적 색이면 칭찬한다", () => {
    const r = rankLips({ L: 53, a: 12, b: 18 }, { L: 42, a: 20, b: 12 }, warm, ITEMS, { subtype: "bright" });
    const notes = r.map((x) => harmonyNote(x.harmony));
    expect(notes.some((n) => n.includes("차가운 핑크·보라"))).toBe(true);
    expect(notes[0]).not.toMatch(/있어요$/);
  });
});

describe("toTrueLab", () => {
  it("분석 공간의 중앙 피부를 분광측색 밝기(L* 약 60)로 옮긴다", () => {
    expect(toTrueLab({ L: 53.1, a: 15.2, b: 18.6 }).L).toBeCloseTo(60, 0);
  });
});
