export interface Lab {
  L: number;
  a: number;
  b: number;
}

/** 랜드마커가 주는 정규화 좌표(0~1). */
export interface Point {
  x: number;
  y: number;
}

/** 선형 RGB(0~1) 삼원색. 조명 보정 게인이나 기준 흰색에 쓴다 */
export interface LinearRgb {
  r: number;
  g: number;
  b: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Season = "spring" | "summer" | "autumn" | "winter";
export type Undertone = "warm" | "cool" | "neutral";
export type Depth = "light" | "deep";
export type ChromaLevel = "clear" | "muted";
export type Confidence = "high" | "mid" | "low";
/** 12시즌 세부 타입. 시즌마다 셋만 허용된다 (봄: light·bright·true 등) */
export type Subtype = "light" | "bright" | "true" | "soft" | "deep";
/** 결과 URL 슬러그. 시즌마다 허용되는 세부 타입 셋만 존재한다 */
export type ToneSlug =
  | "spring-light"
  | "spring-bright"
  | "spring-true"
  | "summer-light"
  | "summer-soft"
  | "summer-true"
  | "autumn-soft"
  | "autumn-deep"
  | "autumn-true"
  | "winter-deep"
  | "winter-bright"
  | "winter-true";

/**
 * 조명(색온도·노출) 보정에 쓴 기준. 앞쪽일수록 믿을 만하다.
 * white: 이용자가 찍은 흰색, teeth·sclera: 사진 안에서 자동으로 찾은 치아·눈 흰자(완전 보정),
 * scene: 배경 평균색(절반만 보정), none: 배경도 없어서 보정 못 함
 */
export type ReferenceSource = "white" | "teeth" | "sclera" | "scene" | "none";

export interface ToneResult {
  season: Season;
  subtype: Subtype;
  tone: ToneSlug;
  undertone: Undertone;
  depth: Depth;
  chroma: ChromaLevel;
  confidence: Confidence;
  lab: Lab;
  ita: number;
  hue: number;
  /** 조명(색온도·노출)을 어떤 식으로든 보정했는지. reference !== "none"과 같다 */
  corrected?: boolean;
  reference?: ReferenceSource;
}

export type LightingIssue =
  | "dark"
  | "bright"
  | "warmCast"
  | "coolCast"
  | "sideLight"
  | "faceSmall";

export interface LightingInput {
  /** 얼굴 패치 평균 휘도(0~255) */
  faceLuma: number;
  /** 얼굴 패치 중 클리핑된 픽셀 비율(0~1) */
  clippedRatio: number;
  /** 프레임 전체 평균 RGB */
  frameMean: { r: number; g: number; b: number };
  /** 양 볼 L* 차이. 한쪽에서만 빛을 받으면 커진다 */
  cheekDeltaL: number;
  /** 얼굴 bbox 폭 / 프레임 폭 */
  faceWidthRatio: number;
}
