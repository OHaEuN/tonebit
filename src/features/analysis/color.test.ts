import { describe, expect, it } from "vitest";
import { chroma, hueAngle, ita, luma, srgbToLab } from "./color";

describe("srgbToLab", () => {
  it("흰색은 L=100, a=b=0", () => {
    const lab = srgbToLab(255, 255, 255);
    expect(lab.L).toBeCloseTo(100, 1);
    expect(lab.a).toBeCloseTo(0, 1);
    expect(lab.b).toBeCloseTo(0, 1);
  });

  it("검정은 L=0", () => {
    expect(srgbToLab(0, 0, 0).L).toBeCloseTo(0, 1);
  });

  it("순수 빨강은 Lindbloom 기준값과 일치한다", () => {
    const lab = srgbToLab(255, 0, 0);
    expect(lab.L).toBeCloseTo(53.24, 1);
    expect(lab.a).toBeCloseTo(80.09, 1);
    expect(lab.b).toBeCloseTo(67.2, 1);
  });

  it("순수 파랑은 b*가 음수다", () => {
    const lab = srgbToLab(0, 0, 255);
    expect(lab.L).toBeCloseTo(32.3, 1);
    expect(lab.b).toBeCloseTo(-107.86, 1);
  });
});

describe("지표", () => {
  it("ITA: L=64, b=16.5인 동아시아 평균 피부는 약 40°", () => {
    expect(ita({ L: 64, a: 10, b: 16.5 })).toBeCloseTo(40.3, 0);
  });

  it("hue: a=10, b=17이면 약 59.5°", () => {
    expect(hueAngle({ L: 60, a: 10, b: 17 })).toBeCloseTo(59.5, 0);
  });

  it("hue는 음수 각도를 0~360으로 감는다", () => {
    expect(hueAngle({ L: 50, a: 10, b: -10 })).toBeCloseTo(315, 0);
  });

  it("chroma는 a,b의 유클리드 거리", () => {
    expect(chroma({ L: 50, a: 3, b: 4 })).toBe(5);
  });

  it("luma는 Rec.601 가중합", () => {
    expect(luma(255, 255, 255)).toBeCloseTo(255, 5);
    expect(luma(0, 255, 0)).toBeCloseTo(149.685, 2);
  });
});
