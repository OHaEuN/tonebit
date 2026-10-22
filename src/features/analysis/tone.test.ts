import { describe, expect, it } from "vitest";
import type { Lab } from "@/types/analysis";
import { AXIS_MARGIN, HUE_COOL_MAX, HUE_WARM_MIN, ITA_LIGHT_MIN, YELLOW_WARM_MIN } from "./constants";
import { classifyTone, runnerUp, seasonOdds } from "./tone";

/** hue, ITA, chroma로 역산한 Lab. 테스트가 임계값 의미로 읽히게 한다. */
function labOf(hueDeg: number, itaDeg: number, c: number): Lab {
  const h = (hueDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const L = 50 + b * Math.tan((itaDeg * Math.PI) / 180);
  return { L, a, b };
}

const NEUTRAL = (HUE_WARM_MIN + HUE_COOL_MAX) / 2;
const WARM = HUE_WARM_MIN + 2 * AXIS_MARGIN.hue;
const COOL = HUE_COOL_MAX - 2 * AXIS_MARGIN.hue;
const LIGHT = ITA_LIGHT_MIN + 2 * AXIS_MARGIN.ita;
const DEEP = ITA_LIGHT_MIN - 2 * AXIS_MARGIN.ita;

describe("classifyTone", () => {
  it("웜 + light → 봄. 완전 보정이면 확신도 high", () => {
    const r = classifyTone(labOf(WARM, LIGHT, 26), "teeth");
    expect(r.season).toBe("spring");
    expect(r.undertone).toBe("warm");
    expect(r.confidence).toBe("high");
    expect(r.reference).toBe("teeth");
    expect(r.corrected).toBe(true);
  });

  it("같은 값이라도 배경 기준·보정 없음이면 확신도는 mid까지", () => {
    expect(classifyTone(labOf(WARM, LIGHT, 26), "scene").confidence).toBe("mid");
    expect(classifyTone(labOf(WARM, LIGHT, 26)).confidence).toBe("mid");
    expect(classifyTone(labOf(WARM, LIGHT, 26)).corrected).toBe(false);
  });

  it("웜 + deep → 가을", () => {
    expect(classifyTone(labOf(WARM, DEEP, 20)).season).toBe("autumn");
  });

  it("쿨 + light → 여름", () => {
    expect(classifyTone(labOf(COOL, LIGHT, 20)).season).toBe("summer");
  });

  it("쿨 + deep → 겨울", () => {
    expect(classifyTone(labOf(COOL, DEEP, 28)).season).toBe("winter");
  });

  it("뉴트럴은 황색도 b*로 가르고 확신도는 low", () => {
    // 뉴트럴 각도에서 b* = c·sin(h). YELLOW_WARM_MIN 위아래로 채도를 잡는다
    const sin = Math.sin((NEUTRAL * Math.PI) / 180);
    const yellow = (YELLOW_WARM_MIN + 4) / sin;
    const pale = (YELLOW_WARM_MIN - 4) / sin;
    const r = classifyTone(labOf(NEUTRAL, LIGHT, yellow), "white");
    expect(r.undertone).toBe("neutral");
    expect(r.season).toBe("spring");
    expect(r.confidence).toBe("low");
    expect(classifyTone(labOf(NEUTRAL, LIGHT, pale)).season).toBe("summer");
    expect(classifyTone(labOf(NEUTRAL, DEEP, yellow)).season).toBe("autumn");
    expect(classifyTone(labOf(NEUTRAL, DEEP, pale)).season).toBe("winter");
  });

  it("임계값 경계: HUE_WARM_MIN은 웜, HUE_COOL_MAX는 쿨, ITA_LIGHT_MIN은 light", () => {
    expect(classifyTone(labOf(HUE_WARM_MIN + 0.01, LIGHT, 24)).undertone).toBe("warm");
    expect(classifyTone(labOf(HUE_COOL_MAX - 0.01, LIGHT, 24)).undertone).toBe("cool");
    expect(classifyTone(labOf(WARM, ITA_LIGHT_MIN + 0.01, 24)).depth).toBe("light");
    expect(classifyTone(labOf(WARM, ITA_LIGHT_MIN - 0.1, 24)).depth).toBe("deep");
  });

  it("경계 근처면 확신도가 내려간다", () => {
    expect(classifyTone(labOf(HUE_WARM_MIN + AXIS_MARGIN.hue * 0.6, LIGHT, 24), "white").confidence).toBe("mid");
    expect(classifyTone(labOf(HUE_WARM_MIN + AXIS_MARGIN.hue * 0.2, LIGHT, 24), "white").confidence).toBe("low");
  });

  it("12시즌: 시즌 안에서 가장 두드러진 축이 세부 타입", () => {
    expect(classifyTone(labOf(WARM, ITA_LIGHT_MIN + 4 * AXIS_MARGIN.ita, 24)).tone).toBe("spring-light");
    expect(classifyTone(labOf(HUE_WARM_MIN + 1, ITA_LIGHT_MIN + 1, 24 + 4 * AXIS_MARGIN.chroma)).tone).toBe("spring-bright");
    expect(classifyTone(labOf(HUE_WARM_MIN + 4 * AXIS_MARGIN.hue, ITA_LIGHT_MIN + 1, 24)).tone).toBe("spring-true");
    expect(classifyTone(labOf(HUE_COOL_MAX - 1, ITA_LIGHT_MIN + 1, 24 - 4 * AXIS_MARGIN.chroma)).tone).toBe("summer-soft");
    expect(classifyTone(labOf(HUE_WARM_MIN + 1, ITA_LIGHT_MIN - 4 * AXIS_MARGIN.ita, 24)).tone).toBe("autumn-deep");
    expect(classifyTone(labOf(HUE_COOL_MAX - 1, ITA_LIGHT_MIN - 1, 24 + 4 * AXIS_MARGIN.chroma)).tone).toBe("winter-bright");
  });
});

describe("seasonOdds", () => {
  const cases = [
    labOf(WARM, LIGHT, 26),
    labOf(COOL, DEEP, 22),
    labOf(HUE_WARM_MIN + 0.5, ITA_LIGHT_MIN - 1, 24),
    labOf(NEUTRAL + 1, LIGHT, 20),
    labOf(NEUTRAL - 1, DEEP, 30),
  ];

  it("합이 1이고 1등은 판정 시즌과 같다", () => {
    for (const lab of cases) {
      for (const ref of ["teeth", "scene", "none"] as const) {
        const odds = seasonOdds(lab, ref);
        const sum = Object.values(odds).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1, 9);
        const season = classifyTone(lab, ref).season;
        expect(runnerUp(season, odds)).not.toBe(season);
        expect(odds[season]).toBeGreaterThanOrEqual(Math.max(...Object.values(odds)) - 1e-9);
      }
    }
  });

  it("보정이 약할수록 1등 확률이 낮아진다", () => {
    const lab = labOf(WARM, LIGHT, 26);
    expect(seasonOdds(lab, "teeth").spring).toBeGreaterThan(seasonOdds(lab, "scene").spring);
    expect(seasonOdds(lab, "scene").spring).toBeGreaterThan(seasonOdds(lab, "none").spring);
  });

  it("뉴트럴은 황색도 쪽으로 기울지만 크게 확신하지 않는다", () => {
    const lab = labOf(NEUTRAL - 1, LIGHT, 26);
    expect(lab.b).toBeGreaterThan(YELLOW_WARM_MIN);
    const odds = seasonOdds(lab, "teeth");
    const warm = odds.spring + odds.autumn;
    expect(warm).toBeGreaterThan(0.5);
    expect(warm).toBeLessThan(0.7);
  });
});
