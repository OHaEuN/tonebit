/**
 * 버튼·칩 모양을 한 곳에서 정한다. 버튼은 살짝 둥근(6px) 검정 사각형이고 모두 같은 높이(48px, 작은 버튼 32px).
 * 타일·사진은 RADIUS.tile(12px)
 * 고정폭 서체는 한글 띄어쓰기까지 넓혀 버리므로 버튼에는 쓰지 않고, 영문 꼬리표(TAG)·메뉴에만 쓴다
 */
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg";
const LABEL = "rounded-[6px] tracking-[-0.01em]";

/** 타일·사진·미디어 모서리 */
export const RADIUS = { tile: "rounded-[12px]" } as const;

export const BUTTON = {
  /** 화면마다 하나뿐인 주 행동 */
  primary: `inline-flex h-12 items-center justify-center gap-2 bg-fg px-7 text-[14px] font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-35 ${LABEL} ${FOCUS}`,
  /** 보조 행동 */
  secondary: `inline-flex h-12 items-center justify-center gap-2 border border-fg bg-bg px-6 text-[14px] font-medium transition-colors hover:bg-fg hover:text-white disabled:cursor-not-allowed disabled:opacity-35 ${LABEL} ${FOCUS}`,
  /** 작은 보조 행동(행 안의 버튼) */
  small: `inline-flex h-8 shrink-0 items-center justify-center border border-fg px-3 text-[13px] font-medium transition-colors hover:bg-fg hover:text-white ${LABEL} ${FOCUS}`,
  /** 밑줄 글자 링크 */
  text: `inline-flex items-center gap-1 text-[14px] font-medium underline underline-offset-4 ${FOCUS}`,
} as const;

/** 라디오(peer)로 고르는 글자 칩. 고르면 검정으로 채운다 */
export const CHOICE_CHIP =
  "inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-fg/20 px-3.5 text-[13px] transition-colors peer-checked:border-fg peer-checked:bg-fg peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-fg peer-focus-visible:ring-offset-2";

/** 작은 표시 꼬리표(예: BEST, 예시) */
export const TAG = "inline-flex items-center rounded-[3px] border border-fg px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase leading-none tracking-[0.04em]";
