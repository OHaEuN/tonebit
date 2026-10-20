import type { Season } from "@/types/analysis";
import type { Swatch } from "@/types/product";
import { hexToLab } from "@/features/analysis/color";
import { SEASON_INFO } from "./palettes";

/**
 * 셀프 드레이핑: 립 두 색을 번갈아 발라 보고 더 나은 쪽을 고른다. 측정 대신 이용자 눈으로 웜/쿨, 라이트/딥을 가른다.
 * 천 드레이프 진단과 립 발라 보기의 체감 차이는 대부분 없었다(김도은·김영삼 2020). 잼페이스도 같은 방식으로 톤을 정한다
 */
export type DrapeSide = "warm" | "cool" | "light" | "deep";
/** 둘이 비슷해 보이면 어느 쪽도 고르지 않는다 */
export type DrapePick = DrapeSide | "same";

export interface DrapeOption {
  swatch: Swatch;
  side: DrapeSide;
}

export type DrapeRound = [DrapeOption, DrapeOption];

/** 축마다 홀수 번 물어 동점이 없다. 두 색은 각 쪽 팔레트에서 밝기 순으로 같은 자리(하위 20%·중간·상위 20%)를 고른다 */
const PICK_AT = [0.2, 0.5, 0.8] as const;
export const ROUNDS_PER_AXIS = PICK_AT.length;

const byLightness = (swatches: Swatch[]) => [...swatches].sort((a, b) => hexToLab(a.hex).L - hexToLab(b.hex).L);
const at = (list: Swatch[], q: number) => list[Math.min(list.length - 1, Math.round(q * (list.length - 1)))];

/** 두 팔레트에서 밝기가 비슷한 색끼리 짝짓는다. 자리 쏠림을 막으려고 라운드마다 좌우를 바꾼다 */
function rounds(x: Swatch[], xSide: DrapeSide, y: Swatch[], ySide: DrapeSide): DrapeRound[] {
  const xs = byLightness(x);
  const ys = byLightness(y);
  return PICK_AT.map((q, i) => {
    const pair: DrapeRound = [
      { swatch: at(xs, q), side: xSide },
      { swatch: at(ys, q), side: ySide },
    ];
    return i % 2 ? [pair[1], pair[0]] : pair;
  });
}

const lips = (...seasons: Season[]) => seasons.flatMap((s) => SEASON_INFO[s].lips);

export function undertoneRounds(): DrapeRound[] {
  return rounds(lips("spring", "autumn"), "warm", lips("summer", "winter"), "cool");
}

/** 고른 웜/쿨 안에서 라이트(봄·여름) 팔레트와 딥(가을·겨울) 팔레트를 비교한다 */
export function depthRounds(warm: boolean): DrapeRound[] {
  return warm ? rounds(lips("spring"), "light", lips("autumn"), "deep") : rounds(lips("summer"), "light", lips("winter"), "deep");
}

/** 더 많이 고른 쪽. 같으면 null */
function majority(picks: DrapePick[], a: DrapeSide, b: DrapeSide): DrapeSide | null {
  const na = picks.filter((p) => p === a).length;
  const nb = picks.filter((p) => p === b).length;
  if (na === nb) return null;
  return na > nb ? a : b;
}

const isWarm = (season: Season) => season === "spring" || season === "autumn";
const isLight = (season: Season) => season === "spring" || season === "summer";

/** 웜/쿨 라운드에서 웜을 더 많이 골랐는지. 비겼으면 측정 결과(fallback)를 따른다 */
export function pickedWarm(picks: DrapePick[], fallback: Season): boolean {
  const side = majority(picks.slice(0, ROUNDS_PER_AXIS), "warm", "cool");
  return side ? side === "warm" : isWarm(fallback);
}

const SEASON_OF: Record<"warm" | "cool", Record<"light" | "deep", Season>> = {
  warm: { light: "spring", deep: "autumn" },
  cool: { light: "summer", deep: "winter" },
};

export interface DrapeResult {
  season: Season;
  /** 비겨서 측정 결과를 따른 축 */
  undecided: ("undertone" | "depth")[];
}

/** 다 고르면 시즌, 아직이면 null. 비긴 축은 측정 시즌(fallback)을 따른다 */
export function drapeResult(picks: DrapePick[], fallback: Season): DrapeResult | null {
  if (picks.length < ROUNDS_PER_AXIS * 2) return null;
  const tone = majority(picks.slice(0, ROUNDS_PER_AXIS), "warm", "cool");
  const depth = majority(picks.slice(ROUNDS_PER_AXIS), "light", "deep");
  const warm = tone ? tone === "warm" : isWarm(fallback);
  const light = depth ? depth === "light" : isLight(fallback);
  const undecided: DrapeResult["undecided"] = [];
  if (!tone) undecided.push("undertone");
  if (!depth) undecided.push("depth");
  return { season: SEASON_OF[warm ? "warm" : "cool"][light ? "light" : "deep"], undecided };
}
