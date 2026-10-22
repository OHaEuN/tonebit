import { describe, expect, it } from "vitest";
import { linearize } from "@/features/analysis/color";
import { swatchColor, swatchReflectance } from "./measure";

const encode = (v: number) => Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
/** 반사율 rho인 면을 조명 light 아래서 찍은 픽셀 n개 */
function shot(rho: [number, number, number], light: [number, number, number], n = 30) {
  return new Uint8ClampedArray(Array.from({ length: n }, () => [...rho.map((p, i) => encode(p * light[i])), 255]).flat());
}

describe("swatchReflectance", () => {
  const lip: [number, number, number] = [0.45, 0.08, 0.1];
  const paper: [number, number, number] = [0.85, 0.85, 0.85];

  it("조명이 달라도 같은 제품은 같은 반사율", () => {
    const results = ([[0.9, 0.8, 0.55], [0.7, 0.75, 0.9]] as [number, number, number][]).map((light) => {
      const check = swatchReflectance(swatchColor(shot(lip, light))!, swatchColor(shot(paper, light))!);
      if ("error" in check) throw new Error(check.error);
      return check.color;
    });
    expect(results[0].r).toBeCloseTo(lip[0], 2);
    expect(results[1].r).toBeCloseTo(lip[0], 2);
    expect(results[1].g).toBeCloseTo(lip[1], 2);
  });

  it("종이를 두 번 누르거나 색이 없는 곳이면 오류", () => {
    const light: [number, number, number] = [0.9, 0.9, 0.9];
    const p = swatchColor(shot(paper, light))!;
    expect(swatchReflectance(p, p)).toEqual({ error: "brighter" });
    expect(swatchReflectance(swatchColor(shot([0.3, 0.3, 0.3], light))!, p)).toEqual({ error: "noColor" });
  });
});

describe("swatchColor", () => {
  it("밝은 반사광 픽셀을 빼고 잰다", () => {
    const base = shot([0.45, 0.08, 0.1], [0.9, 0.9, 0.9], 20);
    const glare = new Uint8ClampedArray(Array.from({ length: 3 }, () => [240, 235, 235, 255]).flat());
    const c = swatchColor(new Uint8ClampedArray([...base, ...glare]))!;
    expect(c.g).toBeCloseTo(linearize(encode(0.08 * 0.9)), 2);
  });
});
