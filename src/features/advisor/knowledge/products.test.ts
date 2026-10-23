import { describe, expect, it } from "vitest";
import { colorWords, describeProduct, PRODUCTS } from "./products";

describe("colorWords", () => {
  it("색을 검색어로 옮긴다", () => {
    expect(colorWords("#E98775")).toContain("웜"); // 피치 코랄
    expect(colorWords("#722432")).toEqual(expect.arrayContaining(["딥", "쿨"])); // 맥 디바
    expect(colorWords("#C27384")).toEqual(expect.arrayContaining(["차분한", "모브·라벤더 핑크"])); // 더스티 로즈
  });

  it("모든 제품에 설명이 붙는다", () => {
    for (const p of PRODUCTS) expect(describeProduct(p)).toMatch(/가격대/);
  });
});
