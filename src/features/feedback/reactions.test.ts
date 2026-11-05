import { describe, expect, it } from "vitest";
import { parseRating, parseReaction } from "./reactions";

describe("parseReaction", () => {
  const VALID = { verdict: "disagree", predicted: "summer-soft", reference: "teeth", source: "image", shots: 2 };
  it("필요한 필드만 꺼낸다", () => {
    expect(parseReaction({ ...VALID, photo: "data:..." })).toEqual(VALID);
  });
  it.each([
    ["없는 반응", { verdict: "love" }],
    ["잘못된 판정", { predicted: "summer" }],
    ["없는 기준", { reference: "moon" }],
    ["장수 범위 밖", { shots: 0 }],
  ])("%s → null", (_, patch) => {
    expect(parseReaction({ ...VALID, ...patch })).toBeNull();
  });
});

describe("parseRating", () => {
  it("제품 id는 3개까지, 형식이 맞아야 한다", () => {
    expect(parseRating({ helpful: true, mode: "ai", products: ["lip-mac-rubywoo"] })).toEqual({ helpful: true, mode: "ai", products: ["lip-mac-rubywoo"] });
    // 실제 id는 한글 브랜드·라인과 대문자 호수가 섞인다
    expect(parseRating({ helpful: false, mode: "search", products: ["lip-롬앤-더-쥬시-래스팅-틴트-03", "lip-토니모리-퍼펙트립스-쇼킹립-틴트-N20"] })?.products).toHaveLength(2);
    expect(parseRating({ helpful: true, mode: "ai", products: ["a", "b", "c", "d"] })).toBeNull();
    expect(parseRating({ helpful: true, mode: "ai", products: ["<script>"] })).toBeNull();
    expect(parseRating({ helpful: "yes", mode: "ai" })).toBeNull();
  });
});
