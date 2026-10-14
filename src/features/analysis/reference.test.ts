import { describe, expect, it } from "vitest";
import type { LinearRgb } from "@/types/analysis";
import { SCLERA_REFERENCE, TEETH_REFERENCE } from "./constants";
import { fullGains, pickGains, usableReference, weakerReference } from "./reference";
import { relativeLuminance } from "./color";

const SKIN: LinearRgb = { r: 0.3, g: 0.2, b: 0.15 };
const skinY = relativeLuminance(SKIN.r, SKIN.g, SKIN.b);
const stat = (c: LinearRgb, n = 50) => ({ ...c, n });

describe("usableReference", () => {
  it("픽셀이 충분하고 피부보다 밝고 색이 옅어야 쓴다", () => {
    expect(usableReference(stat(TEETH_REFERENCE), 20, skinY)).toEqual(TEETH_REFERENCE);
    expect(usableReference(stat(TEETH_REFERENCE, 5), 20, skinY)).toBeNull();
    expect(usableReference(stat({ r: 0.2, g: 0.14, b: 0.1 }), 20, skinY)).toBeNull();
    expect(usableReference(stat({ r: 0.9, g: 0.3, b: 0.2 }), 20, skinY)).toBeNull();
    expect(usableReference(null, 20, skinY)).toBeNull();
  });
});

describe("fullGains", () => {
  it("조명이 달라도 같은 치아·같은 피부는 같은 값으로 돌아온다", () => {
    const results = [
      { r: 1.3, g: 1, b: 0.65 },
      { r: 0.88, g: 1, b: 1.18 },
      { r: 0.55, g: 0.55, b: 0.55 },
    ].map((light) => {
      const g = fullGains({ r: TEETH_REFERENCE.r * light.r, g: TEETH_REFERENCE.g * light.g, b: TEETH_REFERENCE.b * light.b }, TEETH_REFERENCE)!;
      return { r: SKIN.r * light.r * g.r, g: SKIN.g * light.g * g.g, b: SKIN.b * light.b * g.b };
    });
    for (const k of ["r", "g", "b"] as const) {
      expect(results[1][k]).toBeCloseTo(results[0][k], 6);
      expect(results[2][k]).toBeCloseTo(results[0][k], 6);
    }
  });

  it("0이나 음수 기준이면 null", () => {
    expect(fullGains({ r: 0, g: 0.3, b: 0.3 }, TEETH_REFERENCE)).toBeNull();
  });
});

describe("pickGains", () => {
  const scene = { r: 0.2, g: 0.14, b: 0.1 };

  it("흰색 > 치아 > 흰자 > 배경 > 없음 순으로 고른다", () => {
    const white = { r: 0.7, g: 0.68, b: 0.65 };
    const teeth = stat(TEETH_REFERENCE);
    const sclera = [stat(SCLERA_REFERENCE), null];
    expect(pickGains({ white, teeth, sclera, scene, skinY }).reference).toBe("white");
    expect(pickGains({ teeth, sclera, scene, skinY }).reference).toBe("teeth");
    expect(pickGains({ sclera, scene, skinY }).reference).toBe("sclera");
    expect(pickGains({ scene, skinY }).reference).toBe("scene");
    expect(pickGains({ skinY })).toEqual({ gains: null, reference: "none" });
  });

  it("치아가 조건에 안 맞으면 다음 기준으로 넘어간다", () => {
    const dim = stat({ r: 0.2, g: 0.14, b: 0.1 });
    expect(pickGains({ teeth: dim, scene, skinY }).reference).toBe("scene");
  });

  it("기준 색이 목표와 같으면 게인은 1", () => {
    const { gains } = pickGains({ teeth: stat(TEETH_REFERENCE), skinY });
    expect(gains!.r).toBeCloseTo(1, 6);
    expect(gains!.b).toBeCloseTo(1, 6);
  });
});

describe("weakerReference", () => {
  it("더 약한 쪽을 돌려준다", () => {
    expect(weakerReference("teeth", "scene")).toBe("scene");
    expect(weakerReference("none", "white")).toBe("none");
    expect(weakerReference("sclera", "teeth")).toBe("sclera");
  });
});
