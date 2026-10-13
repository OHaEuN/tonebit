import type { LinearRgb } from "@/types/analysis";
import { relativeLuminance } from "./color";
import { SCENE_GAIN_RANGE, SCENE_REFERENCE, SCENE_STRENGTH } from "./constants";

const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, v));

/**
 * 배경 평균색으로 조명(색온도·노출)을 일부 되돌리는 선형 RGB 게인(gray-world, von Kries).
 * 같은 사람도 전구색·형광등·노출에 따라 피부 Lab이 크게 흔들리는데, 배경도 같은 조명을 받으므로
 * 배경이 기준값에서 벗어난 만큼 피부도 되돌린다. 배경 자체의 색(벽·옷)도 섞여 있어서 SCENE_STRENGTH만큼만 보정한다
 */
export function sceneGains(scene: LinearRgb): LinearRgb | null {
  const y = relativeLuminance(scene.r, scene.g, scene.b);
  if (!(y > 0) || scene.r <= 0 || scene.g <= 0 || scene.b <= 0) return null;
  const gain = (k: keyof LinearRgb) => clamp(((SCENE_REFERENCE[k] * SCENE_REFERENCE.y) / scene[k]) ** SCENE_STRENGTH, SCENE_GAIN_RANGE);
  return { r: gain("r"), g: gain("g"), b: gain("b") };
}
