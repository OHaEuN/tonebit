interface AdSlotProps {
  /** 광고 네트워크 슬롯 식별자. 실제 스크립트 연결 시 data 속성으로 넘긴다 */
  slot: string;
}

/** 320×100 고정 크기라 광고가 늦게 붙어도 레이아웃이 밀리지 않는다 (CLS 0). */
export function AdSlot({ slot }: AdSlotProps) {
  return (
    <div
      aria-label="광고"
      data-ad-slot={slot}
      className="mx-auto flex h-[100px] w-[320px] max-w-full items-center justify-center rounded-xl border border-dashed border-line text-xs text-muted"
    >
      광고 영역
    </div>
  );
}
