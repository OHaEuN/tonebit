import type { Season, Subtype, ToneSlug } from "@/types/analysis";
import type { Swatch } from "@/types/product";
import { chroma, hexToLab } from "@/features/analysis/color";
import { SUBTYPE_LABEL } from "@/features/analysis/explain";
import { SEASON_SUBTYPES } from "@/features/analysis/tone";
import { productSwatches } from "./getProducts";

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
      { id: "sp-peachcoral", name: "피치 코랄", hex: "#E98775" },
      { id: "sp-apricot", name: "살구", hex: "#E89A80" },
      { id: "sp-milkycoral", name: "밀키 코랄", hex: "#E58C83" },
      { id: "sp-orangepink", name: "오렌지 핑크", hex: "#E4786F" },
      { id: "sp-coralred", name: "코랄 레드", hex: "#D95A4A" },
      { id: "sp-peachbeige", name: "피치 베이지", hex: "#D9988A" },
      { id: "sp-candypink", name: "캔디 핑크", hex: "#E67F93" },
      { id: "sp-tangerine", name: "탠저린", hex: "#E0674D" },
    ],
    blushes: [
      { id: "sp-b1", name: "피치 블러셔", hex: "#F0A594" },
      { id: "sp-b2", name: "코랄 블러셔", hex: "#EB9A8A" },
      { id: "sp-b3", name: "애프리콧 블러셔", hex: "#F1AD95" },
      { id: "sp-b4", name: "살몬 블러셔", hex: "#ED9C8C" },
    ],
  },
  summer: {
    label: "여름",
    tone: "쿨",
    tagline: "부드럽고 은은한 여름 쿨",
    description: "핑크기가 돌면서 밝고 차분한 피부. 로즈, 모브처럼 뽀얀 파스텔 톤이 자연스럽게 어울려요.",
    accent: "#E27396",
    lips: [
      { id: "su-rosepink", name: "로즈 핑크", hex: "#D97C92" },
      { id: "su-mauvepink", name: "모브 핑크", hex: "#C47F96" },
      { id: "su-dustyrose", name: "더스티 로즈", hex: "#C27384" },
      { id: "su-raspberry", name: "라즈베리", hex: "#BF5572" },
      { id: "su-babypink", name: "베이비 핑크", hex: "#E39DAE" },
      { id: "su-rosynude", name: "로지 누드", hex: "#CC8C8F" },
      { id: "su-softplum", name: "소프트 플럼", hex: "#A86581" },
      { id: "su-coolberry", name: "쿨 베리", hex: "#B75472" },
    ],
    blushes: [
      { id: "su-b1", name: "로즈 블러셔", hex: "#E8A3B5" },
      { id: "su-b2", name: "라벤더 핑크 블러셔", hex: "#DDA5C3" },
      { id: "su-b3", name: "쿨 핑크 블러셔", hex: "#E497AC" },
      { id: "su-b4", name: "모브 블러셔", hex: "#D4A0B4" },
    ],
  },
  autumn: {
    label: "가을",
    tone: "웜",
    tagline: "깊고 따뜻한 가을 웜",
    description: "노란기가 돌면서 깊고 차분한 피부. 브릭, 테라코타처럼 농도 있는 따뜻한 색이 고급스러워요.",
    accent: "#C9643B",
    lips: [
      { id: "au-terracotta", name: "테라코타", hex: "#C2634B" },
      { id: "au-brickrose", name: "브릭 로즈", hex: "#B45A52" },
      { id: "au-mlbb", name: "MLBB 브라운", hex: "#B37469" },
      { id: "au-cinnamon", name: "시나몬", hex: "#B26A52" },
      { id: "au-brickred", name: "브릭 레드", hex: "#A94A3E" },
      { id: "au-taupenude", name: "토프 누드", hex: "#B38274" },
      { id: "au-burgundybrown", name: "버건디 브라운", hex: "#8C3F3D" },
      { id: "au-pumpkin", name: "펌킨", hex: "#CB6F4A" },
    ],
    blushes: [
      { id: "au-b1", name: "테라코타 블러셔", hex: "#D9937A" },
      { id: "au-b2", name: "시나몬 블러셔", hex: "#D08F75" },
      { id: "au-b3", name: "브릭 블러셔", hex: "#CD8778" },
      { id: "au-b4", name: "누드 베이지 블러셔", hex: "#D9A38E" },
    ],
  },
  winter: {
    label: "겨울",
    tone: "쿨",
    tagline: "선명하고 또렷한 겨울 쿨",
    description: "핑크기가 돌면서 대비가 또렷한 피부. 트루 레드, 푸시아처럼 선명한 색이 얼굴을 또렷하게 잡아줘요.",
    accent: "#D11F2F",
    lips: [
      { id: "wi-truered", name: "트루 레드", hex: "#C8283E" },
      { id: "wi-cherry", name: "체리", hex: "#BE2F4A" },
      { id: "wi-fuchsia", name: "푸시아", hex: "#C73A7F" },
      { id: "wi-plum", name: "플럼", hex: "#8A3A5E" },
      { id: "wi-wine", name: "와인", hex: "#8E2C44" },
      { id: "wi-coolpink", name: "쿨 핑크", hex: "#D25B86" },
      { id: "wi-burgundy", name: "버건디", hex: "#7B2B3F" },
      { id: "wi-rosered", name: "로즈 레드", hex: "#C1405A" },
    ],
    blushes: [
      { id: "wi-b1", name: "베리 블러셔", hex: "#D97A9A" },
      { id: "wi-b2", name: "푸시아 블러셔", hex: "#DD7AA0" },
      { id: "wi-b3", name: "플럼 블러셔", hex: "#C9809C" },
      { id: "wi-b4", name: "쿨 레드 블러셔", hex: "#DC7382" },
    ],
  },
};

export const CONFIDENCE_LABEL = { high: "높음", mid: "보통", low: "낮음" } as const;

/** 팔레트·제품 id는 시즌을 넘어 유일하므로 모든 시즌에서 찾는다. 다른 시즌 색을 발라보는 흐름을 위해 */
export function findSwatchById(kind: "lips" | "blushes", id: string | null): Swatch | null {
  if (!id) return null;
  for (const season of SEASONS) {
    const found = [...SEASON_INFO[season][kind], ...productSwatches(season, kind === "lips" ? "lip" : "blush")].find((s) => s.id === id);
    if (found) return found;
  }
  return null;
}

export const TONE_SLUGS = SEASONS.flatMap((season) => SEASON_SUBTYPES[season].map((sub) => `${season}-${sub}` as ToneSlug));

/** "spring-light"와 시즌만 있는 "spring"(→ true) 둘 다 받는다. 옛 공유 링크 호환 */
export function parseTone(slug: string): { season: Season; subtype: Subtype; tone: ToneSlug } | null {
  const [season, sub = "true"] = slug.split("-");
  if (!isSeason(season)) return null;
  if (!SEASON_SUBTYPES[season].includes(sub as Subtype)) return null;
  return { season, subtype: sub as Subtype, tone: `${season}-${sub}` as ToneSlug };
}

export function toneLabel(season: Season, subtype: Subtype): string {
  return `${SEASON_INFO[season].label} ${SEASON_INFO[season].tone} ${SUBTYPE_LABEL[subtype]}`;
}

/** 세부 타입에 맞게 팔레트 순서를 바꾼다. 라이트는 밝은 색부터, 딥은 어두운 색부터, 브라이트는 선명한 색부터, 뮤트는 차분한 색부터 */
export function sortSwatches(swatches: Swatch[], subtype: Subtype): Swatch[] {
  const key: Record<Subtype, ((hex: string) => number) | null> = {
    light: (hex) => -hexToLab(hex).L,
    deep: (hex) => hexToLab(hex).L,
    bright: (hex) => -chroma(hexToLab(hex)),
    soft: (hex) => chroma(hexToLab(hex)),
    true: null,
  };
  const k = key[subtype];
  return k ? [...swatches].sort((a, b) => k(a.hex) - k(b.hex)) : swatches;
}

export interface ToneInfo {
  summary: string;
  /** 피부·눈·머리·인상 */
  traits: string[];
  best: string[];
  avoid: string[];
  tip: string;
}

export const TONE_INFO: Record<ToneSlug, ToneInfo> = {
  "spring-light": {
    summary: "노란기가 살짝 도는 밝고 투명한 피부. 가볍고 맑은 색이 얼굴을 환하게 띄우고, 무겁고 어두운 색은 얼굴을 눌러요.",
    traits: ["피부: 밝은 아이보리에서 밝은 베이지, 홍조가 복숭아빛으로 올라와요", "눈·머리: 밝은 갈색이나 황갈색, 눈동자와 흰자 대비가 부드러워요", "인상: 가볍고 화사하며 부드러운 느낌"],
    best: ["피치", "라이트 코랄", "살구", "크림 베이지", "민트", "라이트 옐로"],
    avoid: ["블랙", "짙은 버건디", "블루 베이스 핑크", "차가운 그레이"],
    tip: "립은 톤 다운보다 맑고 투명한 발색이 잘 맞아요. 글로시나 틴트 타입을 먼저 써 보세요.",
  },
  "spring-bright": {
    summary: "노란기 도는 피부에 눈동자·머리의 대비가 또렷한 타입. 선명하고 따뜻한 색이 생기를 주고, 흐린 색은 밋밋해 보여요.",
    traits: ["피부: 밝은 베이지, 쉽게 생기가 도는 편", "눈·머리: 밝은 갈색이지만 눈동자가 또렷하고 반짝임이 있어요", "인상: 선명하고 발랄한 느낌"],
    best: ["선명한 코랄", "오렌지 레드", "비비드 옐로", "터쿼이즈", "브라이트 그린"],
    avoid: ["흐린 파스텔", "회색빛 뮤트", "베이지 무채색", "짙은 브라운"],
    tip: "포인트 하나는 과감하게 선명하게. 립이 선명하면 나머지는 가볍게 가면 균형이 맞아요.",
  },
  "spring-true": {
    summary: "전형적인 봄 웜. 황금빛이 도는 피부와 따뜻한 갈색 눈·머리. 노란 기운이 섞인 따뜻한 색 전반이 잘 받아요.",
    traits: ["피부: 황금빛 베이지, 햇빛에 쉽게 그을리는 편", "눈·머리: 따뜻한 갈색, 머리카락에 붉은기나 금빛이 비쳐요", "인상: 따뜻하고 친근한 느낌"],
    best: ["코랄", "피치 핑크", "캐멀", "옐로 그린", "따뜻한 아이보리"],
    avoid: ["블루 베이스 핑크", "차가운 그레이", "순백", "실버"],
    tip: "골드 액세서리와 코랄 계열 립이 기본값. 쿨한 핑크는 얼굴만 따로 노는 느낌이 들 수 있어요.",
  },
  "summer-light": {
    summary: "붉은기가 살짝 도는 밝은 피부에 부드러운 대비. 파스텔 톤의 차가운 색이 피부를 뽀얗게 보여 줘요.",
    traits: ["피부: 밝은 핑크 베이지, 홍조가 핑크빛으로 올라와요", "눈·머리: 밝은 갈색에서 애쉬 브라운, 대비가 낮아요", "인상: 부드럽고 맑은 느낌"],
    best: ["라벤더", "베이비 핑크", "스카이 블루", "로즈", "소프트 민트"],
    avoid: ["오렌지", "머스터드", "블랙", "짙은 브라운"],
    tip: "립은 핑크 베이스의 밝은 색을 얇게. 진한 색은 한 번 블렌딩해서 농도를 낮추면 잘 맞아요.",
  },
  "summer-soft": {
    summary: "붉은기 도는 피부에 회색기가 살짝 섞인 부드러운 타입. 채도를 낮춘 차분한 색이 가장 자연스럽고, 쨍한 색은 들떠 보여요.",
    traits: ["피부: 핑크 베이지에 약간 회색기, 쉽게 칙칙해 보일 수 있어요", "눈·머리: 애쉬 브라운, 전체적으로 부드러운 대비", "인상: 차분하고 우아한 느낌"],
    best: ["더스티 로즈", "모브", "그레이시 블루", "라벤더 그레이", "소프트 플럼"],
    avoid: ["선명한 원색", "오렌지", "순백", "네온"],
    tip: "MLBB 계열 중에서도 핑크 베이스를 고르세요. 채도 높은 레드보다 와인빛이 살짝 도는 색이 편해요.",
  },
  "summer-true": {
    summary: "전형적인 여름 쿨. 핑크빛 피부에 블루 베이스의 색이 잘 받고, 노란기 섞인 색은 피부를 누렇게 보이게 해요.",
    traits: ["피부: 핑크 베이지, 햇빛에 붉게 변하는 편", "눈·머리: 다크 브라운에서 애쉬 브라운", "인상: 시원하고 단정한 느낌"],
    best: ["로즈 핑크", "라즈베리", "쿨 블루", "소프트 화이트", "라벤더"],
    avoid: ["노란 베이지", "카키", "오렌지", "골드"],
    tip: "실버 액세서리와 로즈 계열 립이 기본값. 코랄 립은 얼굴이 노랗게 보이기 쉬워요.",
  },
  "autumn-soft": {
    summary: "노란기 도는 피부에 채도가 낮고 부드러운 타입. 흙빛이 섞인 차분한 색이 고급스럽고, 쨍한 색은 피부와 따로 놀아요.",
    traits: ["피부: 베이지에서 황갈색, 살짝 올리브 기운", "눈·머리: 헤이즐이나 소프트 브라운", "인상: 차분하고 내추럴한 느낌"],
    best: ["뮤트 테라코타", "카키", "캐멀", "올리브", "MLBB 브라운"],
    avoid: ["네온", "블루 베이스 핑크", "순백", "짙은 블랙"],
    tip: "브라운이 섞인 립이 자연스러워요. 누드 립을 고를 때는 핑크보다 베이지 베이스로.",
  },
  "autumn-deep": {
    summary: "깊이 있는 피부톤과 짙은 눈·머리. 농도 진한 따뜻한 색이 얼굴을 또렷하게 잡아 주고, 연한 색은 밋밋해 보여요.",
    traits: ["피부: 황갈색에서 짙은 베이지, 깊은 느낌", "눈·머리: 다크 브라운에서 블랙 브라운", "인상: 강하고 깊은 느낌"],
    best: ["브릭", "버건디 브라운", "다크 초콜릿", "포레스트 그린", "머스터드"],
    avoid: ["파스텔", "밝은 핑크", "연한 베이지", "아이시 컬러"],
    tip: "립은 진하게 가도 괜찮아요. 오히려 연한 색은 입술만 빠져 보일 수 있어요.",
  },
  "autumn-true": {
    summary: "전형적인 가을 웜. 골든 베이지 피부에 따뜻한 갈색 눈·머리. 가을 낙엽 같은 흙빛의 따뜻한 색 전반이 잘 받아요.",
    traits: ["피부: 골든 베이지, 햇빛에 잘 그을려요", "눈·머리: 따뜻한 갈색, 머리카락에 붉은기가 돌아요", "인상: 따뜻하고 안정된 느낌"],
    best: ["테라코타", "머스터드", "펌킨", "러스트", "카멜"],
    avoid: ["블랙", "쿨 핑크", "실버", "아이시 블루"],
    tip: "골드 액세서리와 오렌지 브라운 립이 기본값. 레드를 고를 때도 오렌지가 섞인 쪽으로.",
  },
  "winter-deep": {
    summary: "깊고 짙은 쿨 톤. 눈·머리가 어둡고 피부와 대비가 커서 진하고 차가운 색이 얼굴을 또렷하게 만들어요.",
    traits: ["피부: 핑크 베이지에서 올리브 베이지, 깊은 느낌", "눈·머리: 블랙에 가까운 다크 브라운", "인상: 강렬하고 또렷한 느낌"],
    best: ["버건디", "플럼", "와인", "네이비", "블랙"],
    avoid: ["연한 파스텔", "베이지", "오렌지", "골드 브라운"],
    tip: "딥한 와인 립이 가장 잘 받아요. 누드 립은 핑크 베이스의 진한 쪽으로.",
  },
  "winter-bright": {
    summary: "선명한 대비가 특징인 쿨 톤. 피부는 밝거나 핑크빛인데 눈·머리는 짙어서, 맑고 강한 원색이 생기를 줘요.",
    traits: ["피부: 밝은 핑크 베이지나 도자기 같은 느낌", "눈·머리: 짙은 갈색이나 블랙, 눈동자가 또렷해요", "인상: 선명하고 시원한 느낌"],
    best: ["트루 레드", "푸시아", "로열 블루", "순백", "블랙"],
    avoid: ["뮤트 베이지", "흐린 파스텔", "오렌지", "카키"],
    tip: "쨍한 레드나 푸시아 립 하나면 충분해요. 뮤트한 색은 오히려 피곤해 보일 수 있어요.",
  },
  "winter-true": {
    summary: "전형적인 겨울 쿨. 블루 베이스 피부에 또렷한 대비. 차갑고 선명한 색 전반이 잘 받고, 노란기 섞인 색은 피부를 탁하게 해요.",
    traits: ["피부: 핑크 베이지, 햇빛에 붉게 변해요", "눈·머리: 다크 브라운에서 블랙", "인상: 시크하고 또렷한 느낌"],
    best: ["쿨 레드", "핫 핑크", "아이시 블루", "블랙", "화이트"],
    avoid: ["골드", "카멜", "코랄", "머스터드"],
    tip: "실버 액세서리와 블루 베이스 레드 립이 기본값. 코랄·오렌지 립은 피하는 게 안전해요.",
  },
};

