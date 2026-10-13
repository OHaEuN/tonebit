import { describe, expect, it } from "vitest";
import type { LinearRgb } from "@/types/analysis";
import { linearRgbToLab } from "./color";
import { SCLERA_REFERENCE } from "./constants";
import { illuminantGains, isPlausibleWhite } from "./illuminant";

const SKIN: LinearRgb = { r: 0.45, g: 0.3, b: 0.22 };
const tint = (c: LinearRgb, k: LinearRgb): LinearRgb => ({ r: c.r * k.r, g: c.g * k.g, b: c.b * k.b });
const labOf = (c: LinearRgb) => linearRgbToLab(c.r, c.g, c.b);

describe("illuminantGains", () => {
  it("기준 흰자면 보정하지 않는다", () => {
    const g = illuminantGains(SCLERA_REFERENCE)!;
    for (const v of [g.r, g.g, g.b]) expect(v).toBeCloseTo(1, 6);
  });

  it.each([
    ["전구색", { r: 1.2, g: 1, b: 0.78 }],
    ["형광·그늘", { r: 0.88, g: 1, b: 1.18 }],
    ["어두운 노출", { r: 0.55, g: 0.55, b: 0.55 }],
    ["밝은 노출", { r: 1.5, g: 1.5, b: 1.5 }],
  ])("%s 조명을 흰자 기준으로 되돌리면 피부색이 원래대로 돌아온다", (_, light) => {
    const gains = illuminantGains(tint(SCLERA_REFERENCE, light))!;
    const restored = labOf(tint(tint(SKIN, light), gains));
    const truth = labOf(SKIN);
    expect(restored.L).toBeCloseTo(truth.L, 3);
    expect(restored.a).toBeCloseTo(truth.a, 3);
    expect(restored.b).toBeCloseTo(truth.b, 3);
  });

  it("게인은 한계 안으로 묶인다", () => {
    const g = illuminantGains({ r: 0.01, g: 0.5, b: 0.5 })!;
    expect(g.r / g.g).toBeLessThan(2.1);
  });

  it("검은 값이면 null", () => {
    expect(illuminantGains({ r: 0, g: 0, b: 0 })).toBeNull();
  });
});

describe("isPlausibleWhite", () => {
  it("피부보다 밝고 덜 채도 높은 흰자는 믿는다", () => {
    expect(isPlausibleWhite(SCLERA_REFERENCE, SKIN)).toBe(true);
  });

  it("눈이 작아 피부가 잡힌 경우(피부와 비슷한 색·밝기)는 거른다", () => {
    expect(isPlausibleWhite({ r: 0.43, g: 0.3, b: 0.23 }, SKIN)).toBe(false);
  });

  it("피부만큼 붉은 밝은 영역(볼 하이라이트 등)도 거른다", () => {
    expect(isPlausibleWhite({ r: 0.7, g: 0.47, b: 0.34 }, SKIN)).toBe(false);
  });

  it("조명이 바뀌어도 같은 판정을 낸다", () => {
    const light = { r: 1.3, g: 1, b: 0.65 };
    expect(isPlausibleWhite(tint(SCLERA_REFERENCE, light), tint(SKIN, light))).toBe(true);
  });
});
