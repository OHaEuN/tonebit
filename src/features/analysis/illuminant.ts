import type { LinearRgb } from "@/types/analysis";
import { relativeLuminance } from "./color";
import {
  COLOR_GAIN_RANGE,
  EXPOSURE_GAIN_RANGE,
  SCLERA_MIN_CONTRAST,
  SCLERA_REFERENCE,
  SKIN_MIN_REDNESS_OVER_SCLERA,
} from "./constants";

const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, v));
const lum = (c: LinearRgb) => relativeLuminance(c.r, c.g, c.b);

/**
 * 잡힌 "흰자"가 정말 흰자인지. 눈이 작거나 웃어서 감기면 패치에 피부·눈꺼풀이 섞이는데,
 * 그걸 기준으로 보정하면 오히려 크게 틀어진다. 흰자는 피부보다 밝고, 피부는 흰자보다 붉어야 한다
 */
export function isPlausibleWhite(white: LinearRgb, skin: LinearRgb): boolean {
  if (!(white.b > 0 && skin.b > 0)) return false;
  const redness = skin.r / skin.b / (white.r / white.b);
  return lum(white) >= lum(skin) * SCLERA_MIN_CONTRAST && redness >= SKIN_MIN_REDNESS_OVER_SCLERA;
}

/**
 * 눈 흰자를 기준 흰색으로 삼아 조명을 되돌리는 선형 RGB 게인(von Kries).
 * 같은 사람이라도 전구색·형광등·노출에 따라 피부 Lab이 크게 흔들리는데,
 * 흰자도 같은 조명을 받으므로 흰자가 기준색으로 돌아가게 곱하면 조명 영향이 상쇄된다.
 * 노출(밝기)과 색(채널 비율)을 따로 묶어 한쪽이 잘못 잡혀도 크게 튀지 않게 한다.
 */
export function illuminantGains(white: LinearRgb): LinearRgb | null {
  const yWhite = lum(white);
  if (!(yWhite > 0) || white.r <= 0 || white.g <= 0 || white.b <= 0) return null;
  const yRef = lum(SCLERA_REFERENCE);
  const exposure = clamp(yRef / yWhite, EXPOSURE_GAIN_RANGE);
  const channel = (k: keyof LinearRgb) => clamp(SCLERA_REFERENCE[k] / yRef / (white[k] / yWhite), COLOR_GAIN_RANGE);
  return { r: exposure * channel("r"), g: exposure * channel("g"), b: exposure * channel("b") };
}
