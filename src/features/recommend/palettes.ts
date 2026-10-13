import type { Season } from "@/types/analysis";
import type { Swatch } from "@/types/product";

export const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

export function isSeason(value: string): value is Season {
  return (SEASONS as string[]).includes(value);
}

export interface SeasonInfo {
  label: string;
  tone: string;
  tagline: string;
  description: string;
  /** 카드·배지 강조색 */
  accent: string;
  lips: Swatch[];
  blushes: Swatch[];
}

export const SEASON_INFO: Record<Season, SeasonInfo> = {
  spring: {
    label: "봄",
    tone: "웜",
    tagline: "맑고 화사한 봄 웜",
    description: "노란기가 돌면서 밝고 선명한 피부. 코랄, 피치처럼 생기 있는 따뜻한 색이 얼굴을 환하게 띄워요.",
    accent: "#FF7F66",
    lips: [
      { id: "sp-coral", name: "코랄", hex: "#FF7F66" },
      { id: "sp-peach", name: "피치", hex: "#FFA07A" },
      { id: "sp-warmpink", name: "웜 핑크", hex: "#FF8C94" },
      { id: "sp-orangered", name: "오렌지 레드", hex: "#F4553A" },
      { id: "sp-apricot", name: "애프리콧", hex: "#FFB38A" },
      { id: "sp-salmon", name: "살몬", hex: "#F08080" },
    ],
    blushes: [
      { id: "sp-b1", name: "피치 블러셔", hex: "#FFB3A0" },
      { id: "sp-b2", name: "코랄 블러셔", hex: "#FF9E8C" },
      { id: "sp-b3", name: "애프리콧 블러셔", hex: "#FFC4A3" },
    ],
  },
  summer: {
    label: "여름",
    tone: "쿨",
    tagline: "부드럽고 은은한 여름 쿨",
    description: "핑크기가 돌면서 밝고 차분한 피부. 로즈, 모브처럼 뽀얀 파스텔 톤이 자연스럽게 어울려요.",
    accent: "#E27396",
    lips: [
      { id: "su-rose", name: "로즈 핑크", hex: "#E88FA8" },
      { id: "su-mauve", name: "모브", hex: "#C98BA5" },
      { id: "su-raspberry", name: "라즈베리", hex: "#C94C73" },
      { id: "su-lavender", name: "라벤더 핑크", hex: "#D8A0C8" },
      { id: "su-plum", name: "소프트 플럼", hex: "#B06A8E" },
      { id: "su-coolrose", name: "쿨 로즈", hex: "#E27396" },
    ],
    blushes: [
      { id: "su-b1", name: "로즈 블러셔", hex: "#F2B5C9" },
      { id: "su-b2", name: "모브 블러셔", hex: "#E6A5BF" },
      { id: "su-b3", name: "라일락 블러셔", hex: "#D9A6C2" },
    ],
  },
  autumn: {
    label: "가을",
    tone: "웜",
    tagline: "깊고 따뜻한 가을 웜",
    description: "노란기가 돌면서 깊고 차분한 피부. 브릭, 테라코타처럼 농도 있는 따뜻한 색이 고급스러워요.",
    accent: "#C9643B",
    lips: [
      { id: "au-brick", name: "브릭", hex: "#B5453A" },
      { id: "au-terracotta", name: "테라코타", hex: "#C9643B" },
      { id: "au-brownred", name: "브라운 레드", hex: "#8E3B2F" },
      { id: "au-pumpkin", name: "펌킨", hex: "#D2691E" },
      { id: "au-mlbb", name: "MLBB 브라운", hex: "#B86B5B" },
      { id: "au-burgundy", name: "버건디 브라운", hex: "#7B2D2D" },
    ],
    blushes: [
      { id: "au-b1", name: "테라코타 블러셔", hex: "#D28B6E" },
      { id: "au-b2", name: "시나몬 블러셔", hex: "#C97B5A" },
      { id: "au-b3", name: "브릭 블러셔", hex: "#B96A55" },
    ],
  },
  winter: {
    label: "겨울",
    tone: "쿨",
    tagline: "선명하고 또렷한 겨울 쿨",
    description: "핑크기가 돌면서 대비가 또렷한 피부. 트루 레드, 푸시아처럼 선명한 색이 얼굴을 또렷하게 잡아줘요.",
    accent: "#D11F2F",
    lips: [
      { id: "wi-truered", name: "트루 레드", hex: "#D11F2F" },
      { id: "wi-fuchsia", name: "푸시아", hex: "#D32B82" },
      { id: "wi-burgundy", name: "버건디", hex: "#6E1E3A" },
      { id: "wi-plum", name: "플럼", hex: "#7D2F5E" },
      { id: "wi-hotpink", name: "핫 핑크", hex: "#E8366F" },
      { id: "wi-wine", name: "와인", hex: "#8E1C3C" },
    ],
    blushes: [
      { id: "wi-b1", name: "푸시아 블러셔", hex: "#E57BA3" },
      { id: "wi-b2", name: "쿨 핑크 블러셔", hex: "#D75D8E" },
      { id: "wi-b3", name: "베리 블러셔", hex: "#C64A86" },
    ],
  },
};

export const CONFIDENCE_LABEL = { high: "높음", mid: "보통", low: "낮음" } as const;

export function findSwatch(season: Season, kind: "lips" | "blushes", id: string | null): Swatch | null {
  if (!id) return null;
  return SEASON_INFO[season][kind].find((s) => s.id === id) ?? null;
}
