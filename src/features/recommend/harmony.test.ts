import { describe, expect, it } from "vitest";
import type { Lab, Season } from "@/types/analysis";
import { hueAngle } from "@/features/analysis/color";
import { lipHarmony, onLipColor, rankLips, toTrueLab } from "./harmony";

const SKIN: Lab = { L: 62, a: 14, b: 19 };
const even: Record<Season, number> = { spring: 0.25, summer: 0.25, autumn: 0.25, winter: 0.25 };

/** 피부에서 명도·색상각을 바꾼 입술 위 색 */
function lipAt(dL: number, dh: number, c = 40): Lab {
  const h = ((hueAngle(SKIN) - dh) * Math.PI) / 180;
  return { L: SKIN.L - dL, a: c * Math.cos(h), b: c * Math.sin(h) };
}

describe("lipHarmony", () => {
  it("립이 피부보다 밝거나 같으면 명도 항이 음수, 알맞게 어두우면 양수", () => {
    expect(lipHarmony(SKIN, lipAt(-5, 45)).lightness).toBeLessThan(0);
    expect(lipHarmony(SKIN, lipAt(0, 45)).lightness).toBeLessThan(0);
    expect(lipHarmony(SKIN, lipAt(12, 45)).lightness).toBeGreaterThan(0.8);
  });

  it("아주 어두운 립은 조금 깎는다", () => {
    expect(lipHarmony(SKIN, lipAt(40, 45)).lightness).toBeLessThan(lipHarmony(SKIN, lipAt(20, 45)).lightness);
  });

  it("피부에서 붉은·자주 쪽으로 30~65° 떨어진 색이 가장 좋다", () => {
    expect(lipHarmony(SKIN, lipAt(15, 45)).hue).toBeCloseTo(1, 6);
    expect(lipHarmony(SKIN, lipAt(15, 5)).hue).toBeLessThan(0);
    expect(lipHarmony(SKIN, lipAt(15, 110)).hue).toBeLessThan(0);
  });

  it("점수는 0~100", () => {
    for (const [dL, dh] of [[-20, 0], [15, 45], [50, 180]]) {
      const { score } = lipHarmony(SKIN, lipAt(dL, dh));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe("onLipColor", () => {
  it("덮는 정도가 1이면 제품 색, 0이면 입술에 투과색을 건 색", () => {
    const bare: Lab = { L: 48, a: 20, b: 14 };
    const full = onLipColor("#C8283E", bare, 1);
    const tint = onLipColor("#C8283E", bare, 0);
    expect(full.L).toBeLessThan(55);
    expect(tint.L).toBeLessThan(bare.L);
    expect(tint.a).toBeGreaterThan(bare.a);
  });
});

describe("toTrueLab", () => {
  it("분석 공간의 중앙 피부를 분광측색 밝기(L* 약 60)로 옮긴다", () => {
    expect(toTrueLab({ L: 53.1, a: 15.2, b: 18.6 }).L).toBeCloseTo(60, 0);
  });
});

describe("rankLips", () => {
  const items = [
    { id: "coral", name: "코랄", hex: "#E4786F", seasons: ["spring" as Season] },
    { id: "berry", name: "베리", hex: "#B75472", seasons: ["summer" as Season] },
    { id: "pale", name: "살구", hex: "#F0C0A8", seasons: ["spring" as Season] },
  ];

  it("노란 피부일수록 코랄이 베리에 비해 올라간다", () => {
    const warm = rankLips({ L: 55, a: 12, b: 22 }, undefined, even, items);
    const cool = rankLips({ L: 55, a: 17, b: 14 }, undefined, even, items);
    const gap = (r: typeof warm) => r.find((x) => x.item.id === "coral")!.harmony.score - r.find((x) => x.item.id === "berry")!.harmony.score;
    expect(gap(warm)).toBeGreaterThan(gap(cool));
  });

  it("피부보다 밝은 색은 아래로 간다", () => {
    expect(rankLips(SKIN, undefined, even, items).at(-1)!.item.id).toBe("pale");
  });

  it("내 톤일 가능성이 높은 시즌의 색이 올라간다", () => {
    const summer = rankLips(SKIN, undefined, { spring: 0.05, summer: 0.8, autumn: 0.05, winter: 0.1 }, items);
    expect(summer[0].item.id).toBe("berry");
  });
});
