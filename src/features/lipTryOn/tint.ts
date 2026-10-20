import type { LinearRgb } from "@/types/analysis";
import { hexToRgb, linearize, relativeLuminance } from "@/features/analysis/color";

/** 0~255 인코딩 값 → 선형 값 */
const TO_LINEAR = Float32Array.from({ length: 256 }, (_, i) => linearize(i));

function encode(v: number): number {
  const c = Math.min(1, Math.max(0, v));
  return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
}

/** 제품 hex(D65 흰 바탕에서 본 색)를 반사율로 본 선형 RGB */
export function hexToLinear(hex: string): LinearRgb {
  const [r, g, b] = hexToRgb(hex);
  return { r: TO_LINEAR[r], g: TO_LINEAR[g], b: TO_LINEAR[b] };
}

/** 선형 RGB(0~1) → sRGB hex */
export function linearToHex(c: LinearRgb): string {
  return `#${[c.r, c.g, c.b].map((v) => encode(v).toString(16).padStart(2, "0")).join("")}`;
}

/** 제품의 투과색: 가장 센 채널을 1로 맞춘 제품 색. 얇게 바르면 바탕 색에 이 필터가 걸린다 */
function passColor(color: LinearRgb): LinearRgb {
  const peak = Math.max(color.r, color.g, color.b, 1e-6);
  return { r: color.r / peak, g: color.g / peak, b: color.b / peak };
}

/**
 * 바탕(입술·피부) 위에 제품을 발랐을 때의 색. 아래 tintPixels의 한 픽셀 계산과 같은 모델이다(흰색 1, 명암 평균).
 * 립 어울림 점수에서 "실제로 입술 위에 보일 색"을 낼 때 쓴다
 */
export function layerColor(base: LinearRgb, color: LinearRgb, coverage: number): LinearRgb {
  const pass = passColor(color);
  const mix = (b: number, c: number, p: number) => coverage * c + (1 - coverage) * b * p;
  return { r: mix(base.r, color.r, pass.r), g: mix(base.g, color.g, pass.g), b: mix(base.b, color.b, pass.b) };
}

export interface TintSpec {
  /** 제품 색(반사율) */
  color: LinearRgb;
  /** 이 사진에서 완전한 흰색이 찍혔을 값. 제품 색을 사진의 조명·노출에 맞춘다 */
  camera: LinearRgb;
  /** 0~1. 1이면 바탕(입술·피부) 색을 다 덮고, 0이면 투명한 색 필터(틴트) */
  coverage: number;
  /** 0~1. 바탕의 명암(주름·볼륨)을 얼마나 남길지. 매트는 작게, 글로시는 1 */
  texture: number;
  /** 0~1. 진하기 */
  strength: number;
}

/**
 * 마스크 알파만큼 픽셀에 제품을 바른다(제자리 수정). 선형 RGB에서 계산한다.
 * - 덮는 몫: 제품 반사율 × 사진의 흰색 × 바탕 명암(밝기/평균 밝기)^texture. 어두운 사진에서 립이 혼자 빛나지 않는다
 * - 비치는 몫: 바탕 색 × 제품의 투과색(가장 센 채널을 1로 맞춘 제품 색). 틴트처럼 입술색이 비친다
 * 바탕 밝기를 그대로 쓰는 canvas `color` 합성과 달리, 입술보다 밝은 누드 립도 밝게 칠해진다 (Shiseido US10939742·Panasonic US9603437의 "평균 밝기를 제품 밝기로 옮기고 결만 남기기"를 선형 공간에서)
 */
export function tintPixels(pixels: Uint8ClampedArray, mask: Uint8ClampedArray, spec: TintSpec): void {
  let weight = 0;
  let sumY = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const m = mask[i + 3];
    if (!m) continue;
    sumY += m * relativeLuminance(TO_LINEAR[pixels[i]], TO_LINEAR[pixels[i + 1]], TO_LINEAR[pixels[i + 2]]);
    weight += m;
  }
  if (!weight) return;
  const meanY = sumY / weight;
  const { color, camera, coverage, texture, strength } = spec;
  const pass = passColor(color);
  const solid = { r: color.r * camera.r, g: color.g * camera.g, b: color.b * camera.b };

  for (let i = 0; i < pixels.length; i += 4) {
    const m = (mask[i + 3] / 255) * strength;
    if (m <= 0) continue;
    const r = TO_LINEAR[pixels[i]];
    const g = TO_LINEAR[pixels[i + 1]];
    const b = TO_LINEAR[pixels[i + 2]];
    const y = relativeLuminance(r, g, b);
    const shade = meanY > 0 ? (y / meanY) ** texture : 1;
    const mix = (base: number, s: number, p: number) => base + m * (coverage * s * shade + (1 - coverage) * base * p - base);
    pixels[i] = encode(mix(r, solid.r, pass.r));
    pixels[i + 1] = encode(mix(g, solid.g, pass.g));
    pixels[i + 2] = encode(mix(b, solid.b, pass.b));
  }
}
