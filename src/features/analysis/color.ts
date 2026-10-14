import type { Lab } from "@/types/analysis";

/** sRGB 감마 해제. IEC 61966-2-1 */
export function linearize(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

// D65 기준 백색
const XN = 0.95047;
const ZN = 1.08883;
const EPSILON = 216 / 24389;
const KAPPA = 24389 / 27;

function labF(t: number): number {
  return t > EPSILON ? Math.cbrt(t) : (KAPPA * t + 16) / 116;
}

/** sRGB(0~255) → CIELAB. 피부색 문헌(ITA 등)이 전부 Lab 기준이라 이 공간에서 판정한다. */
export function srgbToLab(r: number, g: number, b: number): Lab {
  return linearRgbToLab(linearize(r), linearize(g), linearize(b));
}

/** 선형 RGB(0~1) → CIELAB. 화이트밸런스 보정을 선형 공간에서 곱한 뒤 변환할 때 쓴다 */
export function linearRgbToLab(R: number, G: number, B: number): Lab {
  const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / XN;
  const y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
  const z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / ZN;
  const fx = labF(x);
  const fy = labF(y);
  const fz = labF(z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** CIELAB L* → 상대 휘도 Y (0~1). 역변환 */
export function labToY(L: number): number {
  const fy = (L + 16) / 116;
  return fy > 6 / 29 ? fy ** 3 : (3 * (6 / 29) ** 2) * (fy - 4 / 29);
}

/** 선형 RGB의 상대 휘도 Y (Rec.709) */
export function relativeLuminance(R: number, G: number, B: number): number {
  return 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
}

/** 인코딩 휘도(Rec.601). 감마 해제 전 값이라 "화면에 보이는 밝기"에 가깝다. */
export function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** ITA° = atan((L* − 50) / b*). Chardon(1991) 피부 밝기 지표. */
export function ita(lab: Lab): number {
  return (Math.atan2(lab.L - 50, lab.b) * 180) / Math.PI;
}

/** hue angle(°) = atan2(b*, a*). 클수록 노랑(웜), 작을수록 핑크(쿨). */
export function hueAngle(lab: Lab): number {
  const h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  return h < 0 ? h + 360 : h;
}

export function chroma(lab: Lab): number {
  return Math.hypot(lab.a, lab.b);
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function hexToLab(hex: string): Lab {
  return srgbToLab(...hexToRgb(hex));
}
