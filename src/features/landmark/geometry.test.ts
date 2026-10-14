import { describe, expect, it } from "vitest";
import type { Point } from "@/types/analysis";
import { cheekAnchors, cheekPatches, faceBounds, faceWidthRatio, inPolygon, interocular, mouthFrame, mouthInnerPolygon, scleraRegions, skinPatches } from "./geometry";

/** 468점 전부 중앙에 두고 필요한 점만 덮어쓴다 */
function face(overrides: Record<number, Point>): Point[] {
  const lm: Point[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  for (const [i, p] of Object.entries(overrides)) lm[Number(i)] = p;
  return lm;
}

describe("geometry", () => {
  it("interocular는 33↔263 픽셀 거리", () => {
    const lm = face({ 33: { x: 0.3, y: 0.5 }, 263: { x: 0.7, y: 0.5 } });
    expect(interocular(lm, 1000, 500)).toBeCloseTo(400, 6);
  });

  it("패치는 눈 거리의 25% 정사각형이고 프레임 안으로 클램프된다", () => {
    const lm = face({ 33: { x: 0.3, y: 0.5 }, 263: { x: 0.7, y: 0.5 }, 151: { x: 0.99, y: 0.01 } });
    const patches = skinPatches(lm, 1000, 500);
    expect(patches).toHaveLength(10);
    expect(patches[0]).toEqual({ x: 450, y: 200, w: 100, h: 100 });
    expect(patches[6]).toEqual({ x: 900, y: 0, w: 100, h: 100 });
    expect(cheekPatches(lm, 1000, 500)).toEqual(patches.slice(0, 2));
  });

  it("inPolygon은 ray casting", () => {
    const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    expect(inPolygon(5, 5, square)).toBe(true);
    expect(inPolygon(15, 5, square)).toBe(false);
  });

  it("흰자 영역은 눈 윤곽 폴리곤에서 홍채 원(테두리 거리 × 여유)을 뺀다", () => {
    const lm = face({ 468: { x: 0.4, y: 0.5 }, 469: { x: 0.42, y: 0.5 }, 470: { x: 0.4, y: 0.52 }, 471: { x: 0.38, y: 0.5 }, 472: { x: 0.4, y: 0.48 } });
    const [right] = scleraRegions(lm, 1000, 1000);
    expect(right.poly).toHaveLength(16);
    expect(right.hole.x).toBe(400);
    expect(right.hole.r).toBeCloseTo(20 * 1.15, 6);
  });

  it("입 안쪽 폴리곤은 20점 픽셀 좌표", () => {
    const poly = mouthInnerPolygon(face({ 13: { x: 0.5, y: 0.7 } }), 1000, 1000);
    expect(poly).toHaveLength(20);
    expect(poly.some((p) => p.x === 500 && p.y === 700)).toBe(true);
  });

  it("faceWidthRatio는 x의 범위", () => {
    expect(faceWidthRatio(face({ 0: { x: 0.2, y: 0 }, 1: { x: 0.6, y: 0 } }))).toBeCloseTo(0.4, 5);
  });

  it("faceBounds는 랜드마크의 x·y 범위", () => {
    const lm = face({ 10: { x: 0.2, y: 0.1 }, 152: { x: 0.7, y: 0.9 } });
    expect(faceBounds(lm)).toEqual({ minX: 0.2, maxX: 0.7, minY: 0.1, maxY: 0.9 });
  });

  it("볼 기준점은 각 볼에 더 가까운 눈을 짝으로 쓴다", () => {
    const lm = face({
      50: { x: 0.4, y: 0.6 },
      116: { x: 0.2, y: 0.5 },
      280: { x: 0.6, y: 0.6 },
      345: { x: 0.8, y: 0.5 },
      33: { x: 0.3, y: 0.4 },
      133: { x: 0.45, y: 0.4 },
      263: { x: 0.7, y: 0.4 },
      362: { x: 0.55, y: 0.4 },
    });
    const [left, right] = cheekAnchors(lm, 1000, 1000);
    expect(left.apple).toEqual({ x: 400, y: 600 });
    expect(left.eye.x).toBeCloseTo(375, 6);
    expect(right.eye.x).toBeCloseTo(625, 6);
  });

  it("입 틀은 입꼬리 폭, 위아래 높이, 안쪽 중앙을 쓴다", () => {
    const lm = face({ 61: { x: 0.4, y: 0.7 }, 291: { x: 0.6, y: 0.7 }, 0: { x: 0.5, y: 0.66 }, 17: { x: 0.5, y: 0.76 }, 13: { x: 0.5, y: 0.7 }, 14: { x: 0.5, y: 0.72 } });
    const m = mouthFrame(lm, 1000, 1000);
    expect(m.width).toBeCloseTo(200, 6);
    expect(m.height).toBeCloseTo(100, 6);
    expect(m.center).toEqual({ x: 500, y: 710 });
    expect(m.angle).toBeCloseTo(0, 6);
  });
});
