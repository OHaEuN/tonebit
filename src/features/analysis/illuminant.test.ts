import { describe, expect, it } from "vitest";
import type { LinearRgb } from "@/types/analysis";
import { SCENE_REFERENCE, SCENE_STRENGTH } from "./constants";
import { sceneGains } from "./illuminant";

const REF: LinearRgb = { r: SCENE_REFERENCE.r * SCENE_REFERENCE.y, g: SCENE_REFERENCE.g * SCENE_REFERENCE.y, b: SCENE_REFERENCE.b * SCENE_REFERENCE.y };
const tint = (c: LinearRgb, k: LinearRgb): LinearRgb => ({ r: c.r * k.r, g: c.g * k.g, b: c.b * k.b });

describe("sceneGains", () => {
  it("기준 배경이면 보정하지 않는다", () => {
    const g = sceneGains(REF)!;
    for (const v of [g.r, g.g, g.b]) expect(v).toBeCloseTo(1, 6);
  });

  it.each([
    ["전구색", { r: 1.25, g: 1, b: 0.75 }],
    ["형광·그늘", { r: 0.88, g: 1, b: 1.18 }],
    ["어두운 노출", { r: 0.6, g: 0.6, b: 0.6 }],
  ])("%s 조명은 로그 공간에서 SCENE_STRENGTH만큼 되돌린다", (_, light) => {
    const g = sceneGains(tint(REF, light))!;
    for (const k of ["r", "g", "b"] as const) {
      // 보정 후 남는 조명 = light^(1-STRENGTH)
      expect(light[k] * g[k]).toBeCloseTo(light[k] ** (1 - SCENE_STRENGTH), 6);
    }
  });

  it("게인은 한계 안으로 묶인다", () => {
    const g = sceneGains({ r: 0.0001, g: 0.5, b: 0.5 })!;
    expect(g.r).toBeLessThanOrEqual(2);
  });

  it("검은 배경이면 null", () => {
    expect(sceneGains({ r: 0, g: 0, b: 0 })).toBeNull();
  });
});
