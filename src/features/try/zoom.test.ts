import { describe, expect, it } from "vitest";
import { clampView, containSize, fitView, frameBox, MAX_SCALE, toggleZoom, zoomAt } from "./zoom";

const VP = { w: 400, h: 800 };
const BASE = containSize({ w: 720, h: 900 }, VP); // 400 × 500

describe("zoom", () => {
  it("contain으로 맞추고 가운데에 둔다", () => {
    expect(BASE).toEqual({ w: 400, h: 500 });
    expect(fitView(BASE, VP)).toEqual({ scale: 1, x: 0, y: 150 });
  });

  it("손가락 사이 점을 고정한 채 확대한다", () => {
    const v = zoomAt(fitView(BASE, VP), 2, { x: 200, y: 400 }, BASE, VP);
    // 확대 전 (200, 400)은 사진 위 (200, 250). 확대 후에도 같은 자리에 있어야 한다
    expect(v.x + 200 * v.scale).toBeCloseTo(200);
    expect(v.y + 250 * v.scale).toBeCloseTo(400);
  });

  it("배율과 이동 범위를 넘지 않는다", () => {
    expect(zoomAt(fitView(BASE, VP), 99, { x: 0, y: 0 }, BASE, VP).scale).toBe(MAX_SCALE);
    const v = clampView({ scale: 2, x: 100, y: 100 }, BASE, VP);
    expect(v.x).toBe(0); // 왼쪽 가장자리가 안으로 들어오지 않는다
    expect(clampView({ scale: 2, x: -9999, y: -9999 }, BASE, VP)).toEqual({ scale: 2, x: -400, y: -200 });
  });

  it("더블탭은 확대와 맞춤을 오간다", () => {
    const zoomed = toggleZoom(fitView(BASE, VP), { x: 200, y: 400 }, BASE, VP);
    expect(zoomed.scale).toBeGreaterThan(1);
    expect(toggleZoom(zoomed, { x: 0, y: 0 }, BASE, VP)).toEqual(fitView(BASE, VP));
  });
});

describe("frameBox", () => {
  it("얼굴 상자를 화면 가운데에 크게 잡는다", () => {
    const face = { minX: 0.35, maxX: 0.65, minY: 0.1, maxY: 0.4 };
    const v = frameBox(face, BASE, VP);
    expect(v.scale).toBeCloseTo((400 * 0.8) / (0.3 * 400));
    // 얼굴 가운데(사진 위 200, 125)가 화면 가로 가운데에 온다
    expect(v.x + 200 * v.scale).toBeCloseTo(200);
  });
});
