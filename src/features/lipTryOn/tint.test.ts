import { describe, expect, it } from "vitest";
import { hexToLinear, layerColor, linearToHex, tintPixels } from "./tint";

const rgba = (r: number, g: number, b: number, n = 4) => new Uint8ClampedArray(Array.from({ length: n }, () => [r, g, b, 255]).flat());
const maskOf = (alpha: number, n = 4) => new Uint8ClampedArray(Array.from({ length: n }, () => [0, 0, 0, alpha]).flat());
const WHITE = { r: 1, g: 1, b: 1 };

describe("tintPixels", () => {
  it("다 덮고 결을 안 남기면 제품 색 × 사진의 흰색", () => {
    const px = rgba(150, 80, 80);
    tintPixels(px, maskOf(255), { color: hexToLinear("#D9988A"), camera: WHITE, coverage: 1, texture: 0, strength: 1 });
    expect(linearToHex({ r: hexToLinear("#D9988A").r, g: hexToLinear("#D9988A").g, b: hexToLinear("#D9988A").b })).toBe("#d9988a");
    expect([px[0], px[1], px[2]]).toEqual([0xd9, 0x98, 0x8a]);
  });

  it("입술보다 밝은 누드 립도 밝게 칠한다", () => {
    const px = rgba(150, 80, 80);
    tintPixels(px, maskOf(255), { color: hexToLinear("#E0B0A0"), camera: WHITE, coverage: 0.9, texture: 0.7, strength: 1 });
    expect(px[1]).toBeGreaterThan(80);
  });

  it("어두운 사진에서는 제품도 어둡게 칠한다", () => {
    const bright = rgba(150, 80, 80);
    const dark = rgba(150, 80, 80);
    const spec = { color: hexToLinear("#C8283E"), coverage: 1, texture: 0, strength: 1 };
    tintPixels(bright, maskOf(255), { ...spec, camera: WHITE });
    tintPixels(dark, maskOf(255), { ...spec, camera: { r: 0.3, g: 0.3, b: 0.3 } });
    expect(dark[0]).toBeLessThan(bright[0]);
  });

  it("마스크 밖은 그대로", () => {
    const px = rgba(150, 80, 80);
    tintPixels(px, maskOf(0), { color: hexToLinear("#C8283E"), camera: WHITE, coverage: 1, texture: 0, strength: 1 });
    expect([px[0], px[1], px[2]]).toEqual([150, 80, 80]);
  });

  it("균일한 바탕에서는 layerColor와 같은 색", () => {
    const px = rgba(170, 100, 90);
    const color = hexToLinear("#B75472");
    tintPixels(px, maskOf(255), { color, camera: WHITE, coverage: 0.5, texture: 1, strength: 1 });
    expect(`#${[px[0], px[1], px[2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`).toBe(linearToHex(layerColor(hexToLinear("#AA645A"), color, 0.5)));
  });
});
