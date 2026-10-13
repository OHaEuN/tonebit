import { describe, expect, it } from "vitest";
import type { Point } from "@/types/analysis";
import { blushSpots, faceWidthRatio, interocular, scleraPatches, skinPatches } from "./geometry";

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
    const [cheek, , forehead] = skinPatches(lm, 1000, 500);
    expect(cheek).toEqual({ x: 450, y: 200, w: 100, h: 100 });
    expect(forehead).toEqual({ x: 900, y: 0, w: 100, h: 100 });
  });

  it("faceWidthRatio는 x의 범위", () => {
    expect(faceWidthRatio(face({ 0: { x: 0.2, y: 0 }, 1: { x: 0.6, y: 0 } }))).toBeCloseTo(0.4, 5);
  });

  it("흰자 패치는 홍채와 양쪽 눈꼬리 사이 중점에 놓인다 (홍채 번호 순서와 무관)", () => {
    const lm = face({
      33: { x: 0.3, y: 0.5 },
      133: { x: 0.4, y: 0.5 },
      263: { x: 0.7, y: 0.5 },
      362: { x: 0.6, y: 0.5 },
      // 일부러 반대 눈에 가까운 번호로 둔다
      468: { x: 0.65, y: 0.5 },
      473: { x: 0.35, y: 0.5 },
    });
    const centers = scleraPatches(lm, 1000, 1000).map((r) => r.x + r.w / 2);
    expect(centers).toEqual([325, 375, 675, 625].map((c) => expect.closeTo(c, 0)));
  });

  it("홍채 점이 없는 468점 모델이면 흰자 패치가 없다", () => {
    expect(scleraPatches(face({}).slice(0, 468), 1000, 1000)).toEqual([]);
  });

  it("블러셔 자리는 볼 사과에서 광대 쪽으로 옮겨지고 광대를 향해 기운다", () => {
    const lm = face({ 50: { x: 0.4, y: 0.6 }, 116: { x: 0.2, y: 0.5 }, 280: { x: 0.6, y: 0.6 }, 345: { x: 0.8, y: 0.5 } });
    const [left, right] = blushSpots(lm, 1000, 1000, 0.25);
    expect(left).toMatchObject({ x: expect.closeTo(350, 6), y: expect.closeTo(575, 6) });
    expect(right).toMatchObject({ x: expect.closeTo(650, 6), y: expect.closeTo(575, 6) });
    expect(right.angle).toBeCloseTo(Math.atan2(-100, 200), 6);
  });
});
