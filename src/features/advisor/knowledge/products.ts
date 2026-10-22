import { chroma, hexToLab, hueAngle } from "@/features/analysis/color";
import products from "@/features/recommend/products.json";
import type { PriceTier, ProductSource } from "@/types/product";
import type { Season } from "@/types/analysis";

export const PRODUCTS = products as ProductSource[];

const SEASON_KO: Record<Season, string> = { spring: "봄 웜", summer: "여름 쿨", autumn: "가을 웜", winter: "겨울 쿨" };
const FINISH_KO: Record<string, string> = { matte: "매트", glossy: "글로시", velvet: "벨벳", cream: "크림", powder: "파우더", liquid: "리퀴드" };
export const PRICE_KO: Record<PriceTier, string> = { under20k: "2만원 이하", "20k-40k": "2~4만원대", over40k: "4만원 이상" };

/**
 * 색을 사람이 검색할 법한 말로 옮긴다(코랄·로즈·버건디·MLBB…). 질문의 "차분한 립"·"MLBB"가
 * 벡터 검색에서 제품 설명과 만나게 하는 다리다. Lab 색상각·밝기·채도로 가른다
 */
export function colorWords(hex: string): string[] {
  const lab = hexToLab(hex);
  const h = hueAngle(lab);
  const c = chroma(lab);
  const words: string[] = [];
  if (lab.L < 40) words.push("딥", "다크");
  else if (lab.L > 72) words.push("밝은", "파스텔");
  if (c < 35) words.push("차분한", "MLBB", "뮤트");
  else if (c > 50) words.push("선명한", "비비드");
  if (h >= 345 || h < 12) words.push(lab.L < 40 ? "와인·버건디·플럼" : c < 35 ? "모브·라벤더 핑크" : "핑크·베리·푸시아", "쿨");
  else if (h < 25) words.push(lab.L < 42 ? "와인·체리 레드" : lab.L > 65 ? "로즈 핑크·밀키 핑크" : c >= 50 ? "블루 레드·체리 레드" : "로즈", "쿨");
  else if (h < 34) words.push(lab.L < 45 ? "레드·브릭 레드" : c < 35 ? "말린 장미·로즈 브라운" : "로즈 코랄·레드", "뉴트럴");
  else if (h < 48) words.push(lab.L < 45 ? "칠리·브릭" : c < 35 ? "누드·베이지 코랄·피치 베이지" : "코랄·피치", "웜");
  else words.push(lab.L < 50 ? "브라운·테라코타" : "오렌지·살구", "웜");
  return words;
}

/** 임베딩·답변에 쓰는 제품 설명 한 단락 */
export function describeProduct(p: ProductSource): string {
  const part = p.category === "lip" ? "립" : "블러셔";
  return [
    `${p.brand} ${p.name} ${p.shade}.`,
    `${colorWords(p.hex).join(", ")} 느낌의 ${FINISH_KO[p.finish] ?? p.finish} ${part}.`,
    p.note + ".",
    `${p.seasons.map((s) => SEASON_KO[s]).join("·")}에 어울린다.`,
    `가격대 ${PRICE_KO[p.priceTier]}.`,
  ].join(" ");
}
