import { describe, expect, it } from "vitest";
import type { Lab } from "@/types/analysis";
import { combineShots } from "./shots";

function labOf(hueDeg: number, itaDeg: number, c: number): Lab {
  const h = (hueDeg * Math.PI) / 180;
  const b = c * Math.sin(h);
  return { L: 50 + b * Math.tan((itaDeg * Math.PI) / 180), a: c * Math.cos(h), b };
}

describe("combineShots", () => {
  it("한 장이면 그 장의 판정과 같다", () => {
    const { result, votes } = combineShots([{ lab: labOf(60, 35, 26), corrected: true }]);
    expect(result.season).toBe("spring");
    expect(votes).toEqual({ spring: 1 });
    expect(result.corrected).toBe(true);
  });

  it("한 장만 튀면 중앙값이 나머지 쪽으로 판정한다", () => {
    const { result, votes } = combineShots([
      { lab: labOf(60, 35, 26), corrected: true },
      { lab: labOf(61, 36, 25), corrected: true },
      { lab: labOf(44, 0, 28), corrected: true },
    ]);
    expect(result.season).toBe("spring");
    expect(votes).toEqual({ spring: 2, winter: 1 });
  });

  it("장마다 시즌이 갈리면 확신도는 낮음", () => {
    const { result } = combineShots([
      { lab: labOf(60, 35, 26), corrected: true },
      { lab: labOf(44, 35, 20), corrected: true },
    ]);
    expect(result.confidence).toBe("low");
  });

  it("보정 못 한 장이 하나라도 있으면 corrected는 false", () => {
    const { result } = combineShots([
      { lab: labOf(60, 35, 26), corrected: true },
      { lab: labOf(60, 35, 26), corrected: false },
    ]);
    expect(result.corrected).toBe(false);
    expect(result.reference).toBe("none");
  });

  it("합친 결과의 기준은 가장 약한 장을 따른다", () => {
    const { result } = combineShots([
      { lab: labOf(60, 35, 26), corrected: true, reference: "teeth" },
      { lab: labOf(60, 35, 26), corrected: true, reference: "scene" },
    ]);
    expect(result.reference).toBe("scene");
    expect(combineShots([{ lab: labOf(60, 35, 26), corrected: true, whiteFixed: true }]).result.reference).toBe("white");
  });
});
