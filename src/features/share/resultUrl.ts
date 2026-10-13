import type { ToneSlug } from "@/types/analysis";

/** 공유 URL에는 톤 슬러그만 담는다. 얼굴·측정값은 어떤 형태로도 싣지 않는다. */
export function resultPath(tone: ToneSlug): string {
  return `/r/${tone}`;
}

export function cardImagePath(tone: ToneSlug): string {
  return `/r/${tone}/opengraph-image`;
}
