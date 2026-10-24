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
    expect(parseRating({ helpful: true, mode: "ai", products: ["a", "b", "c", "d"] })).toBeNull();
    expect(parseRating({ helpful: true, mode: "ai", products: ["<script>"] })).toBeNull();
    expect(parseRating({ helpful: "yes", mode: "ai" })).toBeNull();
  });
});
