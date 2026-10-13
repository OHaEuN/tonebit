import { describe, expect, it } from "vitest";
import { classifyTone } from "./tone";
import { explainTone } from "./explain";

describe("explainTone", () => {
  it("웜·라이트·선명이면 각 축의 수치와 임계값을 같이 말한다", () => {
    const lines = explainTone(classifyTone({ L: 68, a: 9, b: 20 }));
    expect(lines.join(" ")).toContain("노란기가 뚜렷");
    expect(lines.join(" ")).toContain("57° 이상이면 웜");
    expect(lines.join(" ")).toContain("41° 이상이면 라이트");
    expect(lines.some((l) => l.includes("세부 타입"))).toBe(true);
  });

  it("뉴트럴이면 경계에 있다고 말하고 확신도는 낮음 문구가 나온다", () => {
    const lines = explainTone(classifyTone({ L: 66, a: 11.5, b: 16.4 }));
    expect(lines[0]).toContain("경계");
    expect(lines.at(-1)).toContain("조명이 바뀌면");
  });
});
