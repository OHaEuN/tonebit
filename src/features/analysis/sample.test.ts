import { describe, expect, it } from "vitest";
import { lumaStats, meanRgb, median, medianLab, representativeLab } from "./sample";

function pixels(rgbs: [number, number, number][]): number[] {
  return rgbs.flatMap(([r, g, b]) => [r, g, b, 255]);
}

const SKIN: [number, number, number] = [222, 184, 160];

describe("median", () => {
  it("홀수·짝수 길이 모두 처리", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe("representativeLab", () => {
  it("동일 피부색만 있으면 그 색의 Lab을 돌려준다", () => {
    const lab = representativeLab(pixels(Array(50).fill(SKIN)));
    expect(lab).not.toBeNull();
    expect(lab!.L).toBeGreaterThan(70);
    expect(lab!.b).toBeGreaterThan(10);
  });

  it("하이라이트(클리핑)와 그림자 픽셀은 사전 제거된다", () => {
    const clean = representativeLab(pixels(Array(50).fill(SKIN)))!;
    const noisy = representativeLab(
      pixels([...Array(50).fill(SKIN), ...Array(20).fill([255, 255, 255]), ...Array(20).fill([10, 10, 10])]),
    )!;
    expect(noisy.L).toBeCloseTo(clean.L, 5);
    expect(noisy.a).toBeCloseTo(clean.a, 5);
  });

  it("머리카락처럼 소수의 어두운 갈색 이상치는 MAD로 걸러진다", () => {
    const clean = representativeLab(pixels(Array(60).fill(SKIN)))!;
    const hair: [number, number, number] = [90, 60, 50];
    const noisy = representativeLab(pixels([...Array(60).fill(SKIN), ...Array(12).fill(hair)]))!;
    expect(noisy.L).toBeCloseTo(clean.L, 3);
  });

  it("유효 픽셀이 너무 적으면 null", () => {
    expect(representativeLab(pixels(Array(5).fill(SKIN)))).toBeNull();
    expect(representativeLab(pixels(Array(100).fill([255, 255, 255])))).toBeNull();
  });
});

describe("조명 통계", () => {
  it("lumaStats는 평균 휘도와 클리핑 비율을 준다", () => {
    const s = lumaStats(pixels([[255, 255, 255], [0, 0, 0], [0, 0, 0], [0, 0, 0]]));
    expect(s.meanLuma).toBeCloseTo(63.75, 2);
    expect(s.clippedRatio).toBe(0.25);
  });

  it("meanRgb는 채널 평균", () => {
    expect(meanRgb(pixels([[200, 100, 0], [0, 100, 200]]))).toEqual({ r: 100, g: 100, b: 100 });
  });

  it("medianLab는 채널별 median", () => {
    const m = medianLab([
      { L: 1, a: 9, b: 5 },
      { L: 2, a: 8, b: 4 },
      { L: 3, a: 7, b: 6 },
    ]);
    expect(m).toEqual({ L: 2, a: 8, b: 5 });
  });
});
