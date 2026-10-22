import type { LinearRgb } from "@/types/analysis";
import { hexToRgb, labToLinear, linearize, linearRgbToLab } from "@/features/analysis/color";

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
  /** 0~1. 제품 색이 얼마나 덮이는지. 1에 가까울수록 입술 원래 색이 덜 비친다 */
  coverage: number;
  /** 0~1. 입술 원래 명암(주름·볼륨)을 얼마나 남길지. 매트는 작게, 글로시는 1 */
  texture: number;
  /** 0~1. 진하기 */
  strength: number;
}

/**
 * 밝기는 제품 쪽으로 이만큼만(덮임 비율 곱) 옮긴다. 제품 칩 색은 밝은 데서 본 덩어리 색이라
 * 입술 곡면 위에서는 그보다 어둡게 보이고, 다 옮기면 립만 떠서 형광처럼 빛난다 (Shiseido US10939742의 평균 L 이동을 일부만)
 */
const LIGHTNESS_SHIFT = 0.5;
/** 색(a*, b*)은 제품 쪽으로 덮임 비율만큼 옮기되 채도를 조금 눌러 사진에 녹인다 */
const CHROMA_SHIFT = 0.85;

/**
 * 마스크 알파만큼 픽셀에 제품을 바른다(제자리 수정). CIELAB에서 계산한다.
 * - 밝기: 입술 평균 밝기를 제품 밝기 쪽으로 일부 옮기고, 픽셀마다 입술 원래 명암(L − 평균)을 texture만큼 남긴다
 * - 색: a*·b*를 제품 쪽으로 옮긴다. 제품 색은 사진의 흰색(조명·노출)을 곱한 값이라 어두운 사진에선 함께 어두워진다
 */
export function tintPixels(pixels: Uint8ClampedArray, mask: Uint8ClampedArray, spec: TintSpec): void {
  const { color, camera, coverage, texture, strength } = spec;
  let weight = 0;
  let sumL = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const m = mask[i + 3];
    if (!m) continue;
    sumL += m * linearRgbToLab(TO_LINEAR[pixels[i]], TO_LINEAR[pixels[i + 1]], TO_LINEAR[pixels[i + 2]]).L;
    weight += m;
  }
  if (!weight) return;
  const meanL = sumL / weight;
  // 사진의 흰색이 1을 넘으면(밝은 사진) 제품이 하얗게 날아가니 가장 센 채널을 1로 묶는다
  const peak = Math.max(1, camera.r, camera.g, camera.b);
  const product = linearRgbToLab((color.r * camera.r) / peak, (color.g * camera.g) / peak, (color.b * camera.b) / peak);
  const targetL = meanL + coverage * LIGHTNESS_SHIFT * (product.L - meanL);
  const chroma = coverage * CHROMA_SHIFT;

  for (let i = 0; i < pixels.length; i += 4) {
    const m = (mask[i + 3] / 255) * strength;
    if (m <= 0) continue;
    const r = TO_LINEAR[pixels[i]];
    const g = TO_LINEAR[pixels[i + 1]];
    const b = TO_LINEAR[pixels[i + 2]];
    const lab = linearRgbToLab(r, g, b);
    const out = labToLinear({
      L: targetL + texture * (lab.L - meanL),
      a: lab.a + chroma * (product.a - lab.a),
      b: lab.b + chroma * (product.b - lab.b),
    });
    pixels[i] = encode(r + m * (out.r - r));
    pixels[i + 1] = encode(g + m * (out.g - g));
    pixels[i + 2] = encode(b + m * (out.b - b));
  }
}
