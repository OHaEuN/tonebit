import { describe, expect, it } from "vitest";
import { hexToLab, srgbToLab } from "@/features/analysis/color";
import { hexToLinear, linearToHex, tintPixels } from "./tint";

const rgba = (r: number, g: number, b: number, n = 4) => new Uint8ClampedArray(Array.from({ length: n }, () => [r, g, b, 255]).flat());
const maskOf = (alpha: number, n = 4) => new Uint8ClampedArray(Array.from({ length: n }, () => [0, 0, 0, alpha]).flat());
const WHITE = { r: 1, g: 1, b: 1 };
const LIP: [number, number, number] = [150, 80, 80];
const labOf = (px: Uint8ClampedArray) => srgbToLab(px[0], px[1], px[2]);

describe("tintPixels", () => {
  it("hex와 선형 RGB를 오가도 같은 색", () => {
    expect(linearToHex(hexToLinear("#D9988A"))).toBe("#d9988a");
  });

  it("색은 제품 쪽으로 옮기되 다 덮지 않는다", () => {
    const px = rgba(...LIP);
    tintPixels(px, maskOf(255), { color: hexToLinear("#C73A7F"), camera: WHITE, coverage: 0.8, texture: 1, strength: 1 });
    const before = srgbToLab(...LIP);
    const after = labOf(px);
    const product = hexToLab("#C73A7F");
    // 푸시아 쪽(b* 감소)으로 가지만 제품 색 그대로는 아니다
    expect(after.b).toBeLessThan(before.b);
    expect(after.b).toBeGreaterThan(product.b);
  });

  it("입술보다 밝은 누드 립은 밝게, 하지만 제품 밝기까지 다 올리지는 않는다", () => {
    const px = rgba(...LIP);
    tintPixels(px, maskOf(255), { color: hexToLinear("#E0B0A0"), camera: WHITE, coverage: 0.9, texture: 1, strength: 1 });
    const L = labOf(px).L;
    expect(L).toBeGreaterThan(srgbToLab(...LIP).L);
    expect(L).toBeLessThan(hexToLab("#E0B0A0").L);
  });

  it("어두운 사진에서는 제품도 어둡게 칠한다", () => {
    const bright = rgba(...LIP);
    const dark = rgba(...LIP);
    const spec = { color: hexToLinear("#E0B0A0"), coverage: 1, texture: 1, strength: 1 };
    tintPixels(bright, maskOf(255), { ...spec, camera: WHITE });
    tintPixels(dark, maskOf(255), { ...spec, camera: { r: 0.3, g: 0.3, b: 0.3 } });
    expect(labOf(dark).L).toBeLessThan(labOf(bright).L);
  });

  it("입술 원래 명암은 texture만큼 남는다", () => {
    const px = new Uint8ClampedArray([170, 95, 95, 255, 120, 60, 60, 255]);
    const before = srgbToLab(170, 95, 95).L - srgbToLab(120, 60, 60).L;
    tintPixels(px, maskOf(255, 2), { color: hexToLinear("#C8283E"), camera: WHITE, coverage: 0.8, texture: 1, strength: 1 });
    const after = srgbToLab(px[0], px[1], px[2]).L - srgbToLab(px[4], px[5], px[6]).L;
    expect(after).toBeCloseTo(before, 0);
  });

  it("마스크 밖과 진하기 0은 그대로", () => {
    const px = rgba(...LIP);
    tintPixels(px, maskOf(0), { color: hexToLinear("#C8283E"), camera: WHITE, coverage: 1, texture: 0, strength: 1 });
    expect([px[0], px[1], px[2]]).toEqual(LIP);
    tintPixels(px, maskOf(255), { color: hexToLinear("#C8283E"), camera: WHITE, coverage: 1, texture: 0, strength: 0 });
    expect([px[0], px[1], px[2]]).toEqual(LIP);
  });
});
