import { describe, expect, it } from "vitest";
import { HUE_WARM_MIN, ITA_LIGHT_MIN } from "./constants";
import { classifyTone } from "./tone";
import { explainTone } from "./explain";

describe("explainTone", () => {
  it("웜·라이트·선명이면 각 축의 수치와 임계값을 같이 말한다", () => {
    const lines = explainTone(classifyTone({ L: 68, a: 9, b: 20 }, "teeth"));
    expect(lines.join(" ")).toContain("노란기가 뚜렷");
    expect(lines.join(" ")).toContain(`${HUE_WARM_MIN}° 이상이면 웜`);
    expect(lines.join(" ")).toContain(`${ITA_LIGHT_MIN}° 이상이면 라이트`);
    expect(lines.some((l) => l.includes("세부 타입"))).toBe(true);
    expect(lines.some((l) => l.includes("치아를 기준"))).toBe(true);
  });

  it("뉴트럴이면 경계에 있다고 말하고 황색도로 갈랐다고 한 뒤 확신도는 낮음 문구가 나온다", () => {
    const lines = explainTone(classifyTone({ L: 66, a: 13, b: 15.8 }));
    expect(lines[0]).toContain("경계");
    expect(lines[0]).toContain("황색도");
    expect(lines.at(-1)).toContain("조명이 바뀌면");
  });

  it("배경 기준이면 더 정확해지는 방법을 알려 주고, 거리가 충분해도 보통까지만이라고 말한다", () => {
    const lines = explainTone(classifyTone({ L: 68, a: 9, b: 20 }, "scene"));
    expect(lines.some((l) => l.includes("배경 색으로 조명을 절반만"))).toBe(true);
    expect(lines.at(-1)).toContain("보통까지만");
  });
});
