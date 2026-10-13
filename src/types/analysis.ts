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

export interface ToneResult {
  season: Season;
  undertone: Undertone;
  depth: Depth;
  chroma: ChromaLevel;
  confidence: Confidence;
  lab: Lab;
  ita: number;
  hue: number;
}

export type LightingIssue =
  | "dark"
  | "bright"
  | "warmCast"
  | "coolCast"
  | "faceSmall";

export interface LightingInput {
  /** 얼굴 패치 평균 휘도(0~255) */
  faceLuma: number;
  /** 얼굴 패치 중 클리핑된 픽셀 비율(0~1) */
  clippedRatio: number;
  /** 프레임 전체 평균 RGB */
  frameMean: { r: number; g: number; b: number };
  /** 얼굴 bbox 폭 / 프레임 폭 */
  faceWidthRatio: number;
}
