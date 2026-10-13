import { describe, expect, it } from "vitest";
import type { Lab } from "@/types/analysis";
import { classifyTone } from "./tone";

/** hue, ITA, chroma로 역산한 Lab. 테스트가 임계값 의미로 읽히게 한다. */
function labOf(hueDeg: number, itaDeg: number, c: number): Lab {
  const h = (hueDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const L = 50 + b * Math.tan((itaDeg * Math.PI) / 180);
  return { L, a, b };
}

describe("classifyTone", () => {
  it("웜 + light → 봄", () => {
    const r = classifyTone(labOf(60, 35, 26));
    expect(r.season).toBe("spring");
    expect(r.undertone).toBe("warm");
    expect(r.confidence).toBe("high");
  });

  it("웜 + deep → 가을", () => {
    expect(classifyTone(labOf(60, 0, 20)).season).toBe("autumn");
  });

  it("쿨 + light → 여름", () => {
    expect(classifyTone(labOf(44, 35, 20)).season).toBe("summer");
  });

  it("쿨 + deep → 겨울", () => {
    expect(classifyTone(labOf(44, 0, 28)).season).toBe("winter");
  });

  it("뉴트럴은 채도로 가르고 확신도는 low", () => {
    const lightClear = classifyTone(labOf(50.5, 35, 28));
    expect(lightClear.undertone).toBe("neutral");
    expect(lightClear.season).toBe("spring");
    expect(lightClear.confidence).toBe("low");
    expect(classifyTone(labOf(50.5, 35, 18)).season).toBe("summer");
    expect(classifyTone(labOf(50.5, 0, 18)).season).toBe("autumn");
    expect(classifyTone(labOf(50.5, 0, 28)).season).toBe("winter");
  });

  it("임계값 경계: hue 52.5는 웜, 48.5는 쿨, ITA 17은 light", () => {
    expect(classifyTone(labOf(52.51, 40, 24)).undertone).toBe("warm");
    expect(classifyTone(labOf(48.49, 40, 24)).undertone).toBe("cool");
    expect(classifyTone(labOf(60, 17.01, 24)).depth).toBe("light");
    expect(classifyTone(labOf(60, 16.9, 24)).depth).toBe("deep");
  });

  it("12시즌: 시즌 안에서 가장 두드러진 축이 세부 타입이 된다", () => {
    expect(classifyTone(labOf(56, 55, 25)).subtype).toBe("light");
    expect(classifyTone(labOf(56, 25, 32)).subtype).toBe("bright");
    expect(classifyTone(labOf(64, 25, 25)).subtype).toBe("true");
    expect(classifyTone(labOf(44, 30, 18)).subtype).toBe("soft");
    expect(classifyTone(labOf(56, -15, 23)).subtype).toBe("deep");
    expect(classifyTone(labOf(44, 0, 28)).tone).toBe("winter-bright");
  });

  it("시즌에 없는 세부 타입은 나오지 않는다", () => {
    const spring = classifyTone(labOf(60, 22, 18));
    expect(spring.season).toBe("spring");
    expect(["light", "bright", "true"]).toContain(spring.subtype);
  });

  it("임계값에 가까우면 확신도가 내려간다", () => {
    expect(classifyTone(labOf(55, 60, 24)).confidence).toBe("mid");
    expect(classifyTone(labOf(54, 60, 24)).confidence).toBe("low");
    expect(classifyTone(labOf(65, 21, 24)).confidence).toBe("low");
  });
});
