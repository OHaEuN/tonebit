import { describe, expect, it } from "vitest";
import { createRateLimiter, MAX_CHARS, parseAdvisorRequest } from "./request";

const VALID = {
  profile: { season: "summer", subtype: "soft", hue: 47, ita: 30, chroma: 21, photo: "data:..." },
  history: [{ role: "user", text: "출근용 립 추천해 줘" }],
};

describe("parseAdvisorRequest", () => {
  it("필요한 값만 꺼낸다(사진 같은 다른 값은 버린다)", () => {
    expect(parseAdvisorRequest(VALID)).toEqual({ profile: { season: "summer", subtype: "soft", hue: 47, ita: 30, chroma: 21 }, history: VALID.history });
  });

  it("긴 말은 자르고, 오래된 대화는 버린다", () => {
    const long = parseAdvisorRequest({ ...VALID, history: [{ role: "user", text: "가".repeat(1000) }] });
    expect(long!.history[0].text).toHaveLength(MAX_CHARS);
    const many = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", text: `${i}` }));
    expect(parseAdvisorRequest({ ...VALID, history: [...many, { role: "user", text: "끝" }] })!.history).toHaveLength(12);
  });

  it.each([
    ["시즌에 없는 세부 타입", { ...VALID, profile: { ...VALID.profile, subtype: "deep" } }],
    ["마지막이 이용자 말이 아님", { ...VALID, history: [{ role: "assistant", text: "안녕" }] }],
    ["빈 대화", { ...VALID, history: [] }],
    ["범위 밖 숫자", { ...VALID, profile: { ...VALID.profile, hue: 999 } }],
  ])("%s → null", (_, body) => {
    expect(parseAdvisorRequest(body)).toBeNull();
  });
});

describe("createRateLimiter", () => {
  it("1분에 정한 횟수까지만 받는다", () => {
    let t = 0;
    const allow = createRateLimiter(2, () => t);
    expect([allow("a"), allow("a"), allow("a"), allow("b")]).toEqual([true, true, false, true]);
    t = 61_000;
    expect(allow("a")).toBe(true);
  });
});
