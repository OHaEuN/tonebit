import { describe, expect, it } from "vitest";
import { parseFeedback } from "./schema";

const VALID = {
  season: "summer",
  subtype: "light",
  predicted: "spring-true",
  lab: { L: 66, a: 13, b: 17 },
  hue: 52.6,
  ita: 40.1,
  shots: 3,
  source: "image",
  corrected: true,
  reference: "teeth",
};

describe("parseFeedback", () => {
  it("필요한 필드만 골라 돌려준다", () => {
    expect(parseFeedback({ ...VALID, extra: "x", image: "data:..." })).toEqual(VALID);
  });

  it("기준이 없는 예전 요청은 보정 여부로 기준을 채운다", () => {
    const legacy: Record<string, unknown> = { ...VALID };
    delete legacy.reference;
    expect(parseFeedback(legacy)?.reference).toBe(VALID.corrected ? "scene" : "none");
    expect(parseFeedback({ ...VALID, reference: "moon" })).toBeNull();
    expect(parseFeedback({ ...VALID, reference: "locked" })?.reference).toBe("locked");
  });

  it("세부 타입을 모르면 null로 받는다", () => {
    expect(parseFeedback({ ...VALID, subtype: null })?.subtype).toBeNull();
  });

  it.each([
    ["없는 시즌", { season: "monsoon" }],
    ["시즌에 없는 세부 타입", { season: "summer", subtype: "deep" }],
    ["잘못된 판정 슬러그", { predicted: "spring" }],
    ["숫자가 아닌 측정값", { hue: "52" }],
    ["범위 밖 측정값", { ita: 400 }],
    ["알 수 없는 소스", { source: "upload" }],
  ])("%s는 거른다", (_, patch) => {
    expect(parseFeedback({ ...VALID, ...patch })).toBeNull();
  });
});
