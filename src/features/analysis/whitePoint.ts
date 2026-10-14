import type { LinearRgb } from "@/types/analysis";
import { linearize, luma } from "./color";
import { CLIP_MAX, WHITE_MAX_CLIPPED, WHITE_MAX_SATURATION, WHITE_MIN_LUMA, WHITE_OVER_SKIN } from "./constants";
import { fullGains, WHITE_TARGET } from "./reference";

export type WhiteCheck = { white: LinearRgb } | { error: "dark" | "clipped" | "colored" };

/**
 * 이용자가 누른 자리의 픽셀이 흰색·밝은 회색인지 보고 평균 선형 RGB를 낸다.
 * 어둡거나(피부보다 밝지 않으면 포함), 하얗게 날아갔거나, 색이 짙으면(옷·피부) 기준으로 쓰지 않는다.
 * skinLuma는 같은 사진 피부의 인코딩 휘도
 */
export function checkWhitePatch(pixels: ArrayLike<number>, skinLuma = 0): WhiteCheck {
  let r = 0;
  let g = 0;
  let b = 0;
  let y = 0;
  let n = 0;
  let clipped = 0;
  for (let i = 0; i + 2 < pixels.length; i += 4) {
    const pr = pixels[i];
    const pg = pixels[i + 1];
    const pb = pixels[i + 2];
    n++;
    if (pr >= CLIP_MAX || pg >= CLIP_MAX || pb >= CLIP_MAX) {
      clipped++;
      continue;
    }
    r += linearize(pr);
    g += linearize(pg);
    b += linearize(pb);
    y += luma(pr, pg, pb);
  }
  const kept = n - clipped;
  if (n === 0 || clipped / n > WHITE_MAX_CLIPPED || kept === 0) return { error: "clipped" };
  if (y / kept < Math.max(WHITE_MIN_LUMA, skinLuma * WHITE_OVER_SKIN)) return { error: "dark" };
  const white = { r: r / kept, g: g / kept, b: b / kept };
  const max = Math.max(white.r, white.g, white.b);
  if ((max - Math.min(white.r, white.g, white.b)) / max > WHITE_MAX_SATURATION) return { error: "colored" };
  return { white };
}

/**
 * 누른 흰색을 기준으로 조명을 완전히 되돌리는 게인. 흰색이 배경 보정 공간의 "흰 종이"
 * (SCENE_REFERENCE 색 비율 × WHITE_TARGET_Y)가 되게 해서 같은 임계값으로 판정한다
 */
export function whiteGains(white: LinearRgb): LinearRgb | null {
  return fullGains(white, WHITE_TARGET);
}
