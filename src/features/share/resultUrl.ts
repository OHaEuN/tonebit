import type { Season } from "@/types/analysis";

/** 공유 URL에는 시즌만 담는다. 얼굴·측정값은 어떤 형태로도 싣지 않는다. */
export function resultPath(season: Season): string {
  return `/r/${season}`;
}

export function cardImagePath(season: Season): string {
  return `/r/${season}/opengraph-image`;
}
