import { describe, expect, it } from "vitest";
import type { LinearRgb } from "@/types/analysis";
import { REFERENCE_NOISE, SCLERA_REFERENCE, TEETH_REFERENCE, TRUE_EXPOSURE } from "./constants";
import { cameraWhite, fullGains, pickGains, usableReference, weakerReference, withChroma, WHITE_TARGET } from "./reference";
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

  it("흰색 > 흰 종이 고정 > 치아 > 흰자 > 배경 > 없음 순으로 고른다", () => {
    const white = { r: 0.7, g: 0.68, b: 0.65 };
    const teeth = stat(TEETH_REFERENCE);
    const sclera = [stat(SCLERA_REFERENCE), null];
    expect(pickGains({ white, locked: white, teeth, sclera, scene, skinY }).reference).toBe("white");
    expect(pickGains({ locked: white, teeth, sclera, scene, skinY }).reference).toBe("locked");
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

describe("흰 종이 고정", () => {
  it("색은 종이에서, 밝기는 치아에서 가져온다", () => {
    const light = { r: 1.15, g: 1, b: 0.8 };
    const exposure = 0.5;
    const paper = { r: WHITE_TARGET.r * light.r * 0.9, g: WHITE_TARGET.g * light.g * 0.9, b: WHITE_TARGET.b * light.b * 0.9 };
    const teeth = stat({ r: TEETH_REFERENCE.r * light.r * exposure, g: TEETH_REFERENCE.g * light.g * exposure, b: TEETH_REFERENCE.b * light.b * exposure });
    const { gains, reference } = pickGains({ locked: paper, teeth, skinY: skinY * exposure });
    expect(reference).toBe("locked");
    // 색 비율은 종이가 정한다: 조명색을 정확히 상쇄
    expect((gains!.r * light.r) / (gains!.g * light.g)).toBeCloseTo(WHITE_TARGET.r / paper.r / (WHITE_TARGET.g / paper.g) * (light.r / light.g), 6);
    // 밝기는 치아 게인과 같다
    const teethOnly = pickGains({ teeth, skinY: skinY * exposure }).gains!;
    const lum = (g: LinearRgb) => relativeLuminance(g.r, g.g, g.b);
    expect(lum(gains!)).toBeCloseTo(lum(teethOnly), 6);
  });

  it("다른 기준이 없으면 밝기는 그대로 두고 색만 되돌린다", () => {
    const paper = { r: 0.5, g: 0.4, b: 0.3 };
    const { gains, reference } = pickGains({ locked: paper, skinY });
    expect(reference).toBe("locked");
    expect(relativeLuminance(gains!.r, gains!.g, gains!.b)).toBeCloseTo(1, 6);
  });

  it("withChroma는 base의 밝기 게인과 chroma의 채널 비율을 합친다", () => {
    const g = withChroma({ r: 2, g: 2, b: 2 }, { r: 1, g: 0.5, b: 0.25 });
    expect(g.r / g.g).toBeCloseTo(2, 6);
    expect(relativeLuminance(g.r, g.g, g.b)).toBeCloseTo(2, 6);
  });
});

describe("치아 + 흰자", () => {
  it("둘 다 보이면 잡음 분산의 역수로 섞는다", () => {
    const teeth = stat({ r: TEETH_REFERENCE.r * 1.2, g: TEETH_REFERENCE.g, b: TEETH_REFERENCE.b });
    const sclera = [stat(SCLERA_REFERENCE)];
    const { gains, reference } = pickGains({ teeth, sclera, skinY });
    expect(reference).toBe("teeth");
    const wTeeth = 1 / REFERENCE_NOISE.teeth / (1 / REFERENCE_NOISE.teeth + 1 / REFERENCE_NOISE.sclera);
    expect(gains!.r).toBeCloseTo((1 / 1.2) ** wTeeth, 6);
    expect(gains!.g).toBeCloseTo(1, 6);
  });
});

describe("cameraWhite", () => {
  it("게인을 거꾸로 돌린 완전한 흰색. 보정이 없으면 보통 사진으로 본다", () => {
    expect(cameraWhite(null).r).toBeCloseTo(1 / TRUE_EXPOSURE, 6);
    expect(cameraWhite({ r: 2, g: 1, b: 0.5 }).b).toBeCloseTo(2 / TRUE_EXPOSURE, 6);
  });
});

describe("weakerReference", () => {
  it("더 약한 쪽을 돌려준다", () => {
    expect(weakerReference("teeth", "scene")).toBe("scene");
    expect(weakerReference("none", "white")).toBe("none");
    expect(weakerReference("sclera", "teeth")).toBe("sclera");
    expect(weakerReference("locked", "teeth")).toBe("teeth");
  });
});
