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

describe("mentionedProducts", () => {
  const hit = (brand: string, shade: string) => ({ id: shade, category: "lip" as const, brand, name: "", shade, hex: "#000", finish: "matte", seasons: [], priceTier: "under20k" as const, description: "", score: 1 });
  it("브랜드와 색 이름이 같이 나와야 센다", async () => {
    const { mentionedProducts } = await import("../agent");
    const hits = [hit("롬앤", "05 피치 미"), hit("디올", "004 코랄"), hit("맥", "칠리")];
    expect(mentionedProducts("롬앤 피치 미와 디올 코랄 립밤이 좋아요", hits).map((h) => h.shade)).toEqual(["05 피치 미", "004 코랄"]);
    expect(mentionedProducts("코랄 컬러가 잘 어울려요", hits)).toEqual([]);
  });
});
