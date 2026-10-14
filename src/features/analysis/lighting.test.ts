import { describe, expect, it } from "vitest";
import { checkLighting } from "./lighting";

const GOOD = {
  faceLuma: 140,
  clippedRatio: 0.01,
  frameMean: { r: 120, g: 120, b: 120 },
  cheekDeltaL: 3,
  faceWidthRatio: 0.4,
};

describe("checkLighting", () => {
  it("정상 조건이면 이슈 없음", () => {
    expect(checkLighting(GOOD)).toEqual([]);
  });

  it("어두우면 dark", () => {
    expect(checkLighting({ ...GOOD, faceLuma: 50 })).toEqual(["dark"]);
  });

  it("너무 밝거나 클리핑이 많으면 bright", () => {
    expect(checkLighting({ ...GOOD, faceLuma: 220 })).toEqual(["bright"]);
    expect(checkLighting({ ...GOOD, clippedRatio: 0.2 })).toEqual(["bright"]);
  });

  it("R/G가 크면 warmCast, B/G가 크면 coolCast", () => {
    expect(checkLighting({ ...GOOD, frameMean: { r: 160, g: 120, b: 110 } })).toEqual(["warmCast"]);
    expect(checkLighting({ ...GOOD, frameMean: { r: 110, g: 120, b: 160 } })).toEqual(["coolCast"]);
  });

  it("양 볼 밝기가 크게 다르면 sideLight", () => {
    expect(checkLighting({ ...GOOD, cheekDeltaL: 20 })).toEqual(["sideLight"]);
  });

  it("얼굴이 작으면 faceSmall", () => {
    expect(checkLighting({ ...GOOD, faceWidthRatio: 0.1 })).toEqual(["faceSmall"]);
  });
});
