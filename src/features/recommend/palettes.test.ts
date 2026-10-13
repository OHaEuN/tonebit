import { describe, expect, it } from "vitest";
import { parseTone, sortSwatches, TONE_INFO, TONE_SLUGS, toneLabel } from "./palettes";

describe("palettes", () => {
  it("12개 톤 전부 설명이 있다", () => {
    expect(TONE_SLUGS).toHaveLength(12);
    for (const slug of TONE_SLUGS) expect(TONE_INFO[slug].best.length).toBeGreaterThan(0);
  });

  it("parseTone은 시즌만 있으면 true로, 시즌에 없는 세부 타입은 거절한다", () => {
    expect(parseTone("spring")).toEqual({ season: "spring", subtype: "true", tone: "spring-true" });
    expect(parseTone("summer-soft")?.tone).toBe("summer-soft");
    expect(parseTone("spring-deep")).toBeNull();
    expect(parseTone("nope")).toBeNull();
  });

  it("라벨은 시즌 웜쿨 세부타입 순", () => {
    expect(toneLabel("autumn", "deep")).toBe("가을 웜 딥");
  });

  it("sortSwatches: 라이트는 밝은 색부터, 딥은 어두운 색부터", () => {
    const sw = [
      { id: "a", name: "dark", hex: "#602020" },
      { id: "b", name: "light", hex: "#FFB0A0" },
    ];
    expect(sortSwatches(sw, "light")[0].id).toBe("b");
    expect(sortSwatches(sw, "deep")[0].id).toBe("a");
    expect(sortSwatches(sw, "true")).toBe(sw);
  });
});
