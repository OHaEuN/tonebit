import type { Lab, Season } from "@/types/analysis";
import type { Finish, Swatch } from "@/types/product";
import { hueAngle, labToLinear, linearRgbToLab } from "@/features/analysis/color";
import { toTrueSpace } from "@/features/analysis/reference";
import { hexToLinear, layerColor } from "@/features/lipTryOn/tint";

/**
 * 맨입술을 못 읽었을 때 피부에 더하는 입술-피부 차이. 한국 20대 여성 500명 맨입술 평균(민혜조 2011: L* 47.6, a* 20.2, b* 13.6)과
 * 볼 평균(김도은·김영삼 2020: 약 60, 13.5, 17.2)의 차이다
 */
const LIP_FROM_SKIN: Lab = { L: -12.4, a: 6.7, b: -3.4 };

/** 제형별로 입술색을 덮는 정도. 렌더링(LIP_STYLES)과 같은 순서의 출발값 */
export const FINISH_COVERAGE: Record<Finish, number> = { matte: 0.9, velvet: 0.8, cream: 0.75, liquid: 0.75, glossy: 0.5, powder: 0.5 };
/** 제형을 모르는 팔레트 색 */
const DEFAULT_COVERAGE = 0.75;

/**
 * 립 색과 피부의 관계로 본 어울림. 근거는 POLA 연구(Hirayama 외 1998, 粧技誌 32(2), 평가자 137명, 수량화 I류 R=0.84):
 * 어울린다는 평가는 피부색 자체보다 "립과 피부의 차이"가 결정했고, 영향 크기는 명도차 > 색상차 > 채도차였다.
 * - 명도: 립이 피부보다 어두워야 좋고, 같거나 밝으면 나빴다
 * - 색상: 피부(5YR)에서 붉은·자주 쪽으로 먼셀 100분할 9~19단계(6R~6RP) 떨어진 립이 가장 좋았다. CIELAB 색상각으로 약 30~65°
 * - 붉은기: 입술 a*가 피부보다 높을수록 매력·여성성이 높았다 (Stephen & McKeegan 2010, Porcheron 2013)
 * - 아주 어두운 립은 피부를 더 어두워 보이게 했다 (Kobayashi 2017, d=0.58). 명도차가 지나치게 크면 조금 깎는다
 * 가중치(0.5/0.3/0.2)와 반응 폭은 이 순서만 반영한 출발값이다
 */
const HUE_WINDOW = [30, 65] as const;
const HUE_FALLOFF = 20;
const LIGHTNESS_PIVOT = 2;
const LIGHTNESS_SCALE = 6;
/** 명도차가 이보다 크면 감점을 시작해 DARK_SCALE마다 1씩 깎는다 */
const DARK_START = 25;
const DARK_SCALE = 20;
const REDNESS_SCALE = 15;
const WEIGHTS = { lightness: 0.5, hue: 0.3, redness: 0.2 } as const;
/**
 * 최종 점수에서 진단 시즌의 몫. 셀카 시즌 판정은 공개 최고치도 약 55%라서 피부와의 색 차이(위 연구)를 더 크게 본다
 */
const SEASON_WEIGHT = 0.4;

export interface Harmony {
  /** 0~100. 피부와의 색 차이만 본 점수 */
  score: number;
  /** 각 항목 −1~1 */
  lightness: number;
  hue: number;
  redness: number;
  /** 피부 색상각 − 입술 위 색상각(°). 양수면 립이 피부보다 붉은·자주 쪽 */
  hueGap: number;
}

const wrap180 = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/** 실제 색 공간의 피부와, 입술 위에 보일 색으로 본 어울림 */
export function lipHarmony(skin: Lab, onLip: Lab): Harmony {
  const dL = skin.L - onLip.L;
  const lightness = Math.tanh((dL - LIGHTNESS_PIVOT) / LIGHTNESS_SCALE) - Math.max(0, dL - DARK_START) / DARK_SCALE;
  const hueGap = wrap180(hueAngle(skin) - hueAngle(onLip));
  const outside = Math.max(HUE_WINDOW[0] - hueGap, hueGap - HUE_WINDOW[1], 0);
  const hue = 2 * Math.exp(-((outside / HUE_FALLOFF) ** 2)) - 1;
  const redness = Math.tanh((onLip.a - skin.a) / REDNESS_SCALE);
  const h = WEIGHTS.lightness * lightness + WEIGHTS.hue * hue + WEIGHTS.redness * redness;
  return { score: Math.round((h + 1) * 50), lightness, hue, redness, hueGap };
}

/** 분석 공간 Lab → 실제 색(분광측색 밝기) 공간 Lab */
export function toTrueLab(lab: Lab): Lab {
  const c = toTrueSpace(labToLinear(lab));
  return linearRgbToLab(c.r, c.g, c.b);
}

/** 입술 위에 실제로 보일 색. 실제 색 공간의 맨입술 위에 제품을 제형만큼 덮는다 */
export function onLipColor(hex: string, bareLip: Lab, coverage: number): Lab {
  const c = layerColor(labToLinear(bareLip), hexToLinear(hex), coverage);
  return linearRgbToLab(c.r, c.g, c.b);
}

export interface HarmonyItem extends Swatch {
  finish?: Finish;
  /** 이 색이 속한 시즌 팔레트 */
  seasons: Season[];
}

export interface RankedItem<T extends HarmonyItem> {
  item: T;
  harmony: Harmony;
  /** 0~100. 피부와의 색 차이(60%)와 진단 시즌 확률(40%)을 합친 최종 점수 */
  score: number;
}

/** 이 색의 시즌들 중 가장 가능성 높은 시즌의 확률을, 1등 시즌 확률 대비 비율로(0~1) */
function seasonFit(seasons: Season[], odds: Record<Season, number>): number {
  const top = Math.max(...Object.values(odds));
  return top > 0 ? Math.max(0, ...seasons.map((s) => odds[s])) / top : 0;
}

/**
 * 측정한 피부·입술(분석 공간)과 시즌 확률로 립 후보를 어울림 높은 순으로 줄 세운다. 입술을 못 읽었으면 피부에 평균 입술-피부 차이를 더해 쓴다
 */
export function rankLips<T extends HarmonyItem>(skin: Lab, lip: Lab | undefined, odds: Record<Season, number>, items: T[]): RankedItem<T>[] {
  const s = toTrueLab(skin);
  const bare = lip ? toTrueLab(lip) : { L: s.L + LIP_FROM_SKIN.L, a: s.a + LIP_FROM_SKIN.a, b: s.b + LIP_FROM_SKIN.b };
  return items
    .map((item) => {
      const harmony = lipHarmony(s, onLipColor(item.hex, bare, item.finish ? FINISH_COVERAGE[item.finish] : DEFAULT_COVERAGE));
      const score = Math.round((1 - SEASON_WEIGHT) * harmony.score + SEASON_WEIGHT * 100 * seasonFit(item.seasons, odds));
      return { item, harmony, score };
    })
    .sort((a, b) => b.score - a.score);
}

/** 점수를 만든 이유 중 가장 도드라진 것 하나를 말로 */
export function harmonyNote(h: Harmony): string {
  if (h.lightness < 0) return "피부와 밝기가 비슷하거나 더 밝아서 입술이 묻혀 보일 수 있어요";
  if (h.hue < 0 && h.hueGap < HUE_WINDOW[0]) return "피부와 색감이 가까워 얼굴과 섞여 보일 수 있어요";
  if (h.hue < 0) return "피부보다 지나치게 보랏빛이라 얼굴과 따로 놀 수 있어요";
  if (h.redness < 0.3) return "붉은기가 약해서 혈색이 덜 살아 보여요";
  if (h.score >= 75) return "피부보다 알맞게 진하고, 붉은 쪽으로 알맞게 떨어져 있어요";
  return "무난하게 어울려요";
}
