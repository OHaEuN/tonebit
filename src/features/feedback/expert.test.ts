import { describe, expect, it } from "vitest";
import { compareExpert } from "./expert";
import { progressText } from "./progress";

const odds = { spring: 0.4, summer: 0.3, autumn: 0.2, winter: 0.1 };

describe("전문가 진단과 견주기", () => {
  it("세부 타입을 모르면 시즌만 본다", () => {
    expect(compareExpert({ season: "spring", subtype: null }, { season: "spring", subtype: "light" }, odds)).toBe("same");
  });
  it("시즌은 같고 세부 타입이 다르면 따로 알린다", () => {
    expect(compareExpert({ season: "spring", subtype: "bright" }, { season: "spring", subtype: "light" }, odds)).toBe("subtype");
  });
  it("전문가 시즌이 다음 후보였는지 본다", () => {
    expect(compareExpert({ season: "summer", subtype: null }, { season: "spring", subtype: "light" }, odds)).toBe("runnerUp");
    expect(compareExpert({ season: "winter", subtype: null }, { season: "spring", subtype: "light" }, odds)).toBe("different");
  });
});

describe("모인 진단 한 줄", () => {
  it("20명 전에는 남은 수, 넘으면 일치율", () => {
    expect(progressText(0, 0)).toBe("20명이 모이면 전문가 진단과의 일치율을 공개해요");
    expect(progressText(17, 9)).toBe("지금까지 17명이 알려 줬어요 · 3명만 더 모이면 일치율을 공개해요");
    expect(progressText(40, 30)).toBe("지금까지 40명이 알려 줬어요 · 전문가 진단과 75% 일치");
  });
});
