import { describe, expect, it } from "vitest";
import { accuracy, calibrate, DEFAULT_POLICY, fitThresholds, type LabeledSample } from "./calibrate";
import { seasonFor, type Thresholds } from "./tone";

const CURRENT: Thresholds = { hueCenter: 50.5, itaLightMin: 17, chromaClearMin: 24 };

/** "진짜" 기준값 truth로 전문가가 판정했다고 치고 표본을 만든다. 결정적인 의사 난수 */
function synth(n: number, truth: Thresholds, noise = 0): LabeledSample[] {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => {
    const hue = 38 + rand() * 26;
    const ita = -5 + rand() * 50;
    const chroma = 16 + rand() * 16;
    let expert = seasonFor(hue, ita, chroma, truth);
    if (rand() < noise) expert = (["spring", "summer", "autumn", "winter"] as const)[Math.floor(rand() * 4)];
    return { hue, ita, chroma, expert };
  });
}

describe("calibrate", () => {
  it("전문가 기준이 지금보다 웜 쪽으로 2° 밀려 있으면 그만큼 찾아낸다", () => {
    const truth = { hueCenter: 52.5, itaLightMin: 22, chromaClearMin: 24 };
    const fit = fitThresholds(synth(400, truth), CURRENT, DEFAULT_POLICY.maxStep);
    expect(fit.hueCenter).toBeCloseTo(52.5, 0);
    expect(fit.itaLightMin).toBeCloseTo(22, 0);
  });

  it("교차검증으로 이득이 충분하면 바꾸자고 한다", () => {
    const r = calibrate(synth(300, { hueCenter: 53, itaLightMin: 23, chromaClearMin: 24 }, 0.1), CURRENT);
    expect(r.apply).toBe(true);
    expect(r.cvAccuracy).toBeGreaterThan(r.currentAccuracy + 0.02);
  });

  it("지금 기준이 이미 맞으면 그대로 둔다", () => {
    const r = calibrate(synth(300, CURRENT, 0.1), CURRENT);
    expect(r.apply).toBe(false);
  });

  it("표본이 적으면 그대로 둔다", () => {
    const r = calibrate(synth(20, { hueCenter: 56, itaLightMin: 30, chromaClearMin: 24 }), CURRENT);
    expect(r.apply).toBe(false);
    expect(r.reason).toContain("20건");
  });

  it("한 번에 최대 폭 이상 움직이지 않는다", () => {
    const fit = fitThresholds(synth(400, { hueCenter: 60, itaLightMin: 40, chromaClearMin: 24 }), CURRENT, DEFAULT_POLICY.maxStep);
    expect(fit.hueCenter).toBeLessThanOrEqual(CURRENT.hueCenter + DEFAULT_POLICY.maxStep.hueCenter);
    expect(fit.itaLightMin).toBeLessThanOrEqual(CURRENT.itaLightMin + DEFAULT_POLICY.maxStep.itaLightMin);
  });

  it("accuracy는 같은 규칙으로 채점한다", () => {
    expect(accuracy(synth(100, CURRENT), CURRENT)).toBe(1);
  });
});
