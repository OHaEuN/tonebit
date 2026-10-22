import { describe, expect, it } from "vitest";
import { accuracy, calibrate, DEFAULT_POLICY, fitThresholds, type LabeledSample } from "./calibrate";
import { classifyTone, CURRENT_THRESHOLDS, seasonFor, type Thresholds } from "./tone";

const CURRENT: Thresholds = { hueCenter: 50.7, yellowWarmMin: 18.3, itaLightMin: 9.5 };

/** "진짜" 기준값 truth로 전문가가 판정했다고 치고 표본을 만든다. 결정적인 의사 난수 */
function synth(n: number, truth: Thresholds, noise = 0): LabeledSample[] {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => {
    const hue = 38 + rand() * 26;
    const ita = -20 + rand() * 60;
    const yellow = 10 + rand() * 16;
    let expert = seasonFor(hue, yellow, ita, truth);
    if (rand() < noise) expert = (["spring", "summer", "autumn", "winter"] as const)[Math.floor(rand() * 4)];
    return { hue, yellow, ita, expert };
  });
}

describe("calibrate", () => {
  it("전문가 기준이 지금보다 웜 쪽으로 2° 밀려 있으면 그만큼 찾아낸다", () => {
    const truth = { hueCenter: 52.7, yellowWarmMin: 20, itaLightMin: 14 };
    const fit = fitThresholds(synth(600, truth), CURRENT, DEFAULT_POLICY.maxStep);
    expect(fit.hueCenter).toBeCloseTo(52.7, 0);
    expect(fit.itaLightMin).toBeCloseTo(14, 0);
  });

  it("교차검증으로 이득이 충분하면 바꾸자고 한다", () => {
    const r = calibrate(synth(300, { hueCenter: 53, yellowWarmMin: 18.3, itaLightMin: 16 }, 0.1), CURRENT);
    expect(r.apply).toBe(true);
    expect(r.cvAccuracy).toBeGreaterThan(r.currentAccuracy + 0.02);
  });

  it("지금 기준이 이미 맞으면 그대로 둔다", () => {
    const r = calibrate(synth(300, CURRENT, 0.1), CURRENT);
    expect(r.apply).toBe(false);
  });

  it("표본이 적으면 그대로 둔다", () => {
    const r = calibrate(synth(20, { hueCenter: 56, yellowWarmMin: 18.3, itaLightMin: 25 }), CURRENT);
    expect(r.apply).toBe(false);
    expect(r.reason).toContain("20건");
  });

  it("한 번에 최대 폭 이상 움직이지 않는다", () => {
    const fit = fitThresholds(synth(400, { hueCenter: 60, yellowWarmMin: 18.3, itaLightMin: 35 }), CURRENT, DEFAULT_POLICY.maxStep);
    expect(fit.hueCenter).toBeLessThanOrEqual(CURRENT.hueCenter + DEFAULT_POLICY.maxStep.hueCenter);
    expect(fit.itaLightMin).toBeLessThanOrEqual(CURRENT.itaLightMin + DEFAULT_POLICY.maxStep.itaLightMin);
  });

  it("accuracy는 같은 규칙으로 채점한다", () => {
    expect(accuracy(synth(100, CURRENT), CURRENT)).toBe(1);
  });

  it("seasonFor는 지금 기준에서 classifyTone과 같은 시즌을 낸다", () => {
    let seed = 11;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 500; i++) {
      const lab = { L: 45 + rand() * 30, a: 5 + rand() * 15, b: 8 + rand() * 18 };
      const r = classifyTone(lab);
      expect(seasonFor(r.hue, lab.b, r.ita, CURRENT_THRESHOLDS)).toBe(r.season);
    }
  });
});
