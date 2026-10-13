"use client";

import { useEffect, useRef } from "react";

interface AdSlotProps {
  /** 카카오 AdFit 광고단위 ID (DAN-…). 없으면 placeholder만 그린다 */
  unit: string | undefined;
}

const SIZE = { width: 320, height: 100 } as const;
const ADFIT_SCRIPT = "https://t1.daumcdn.net/kas/static/ba.min.js";

/**
 * 320×100 고정 크기라 광고가 늦게 붙어도 레이아웃이 밀리지 않는다 (CLS 0).
 * AdFit 스크립트는 로드 시점에 .kakao_ad_area를 한 번 훑기만 해서, 클라이언트 내비게이션으로
 * 다시 마운트될 때마다 <ins>와 <script>를 새로 넣는다. 심사 승인 전에는 빈 영역으로 보인다.
 */
export function AdSlot({ unit }: AdSlotProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!unit || !host) return;
    const ins = document.createElement("ins");
    ins.className = "kakao_ad_area";
    ins.style.display = "none";
    ins.dataset.adUnit = unit;
    ins.dataset.adWidth = String(SIZE.width);
    ins.dataset.adHeight = String(SIZE.height);
    const script = document.createElement("script");
    script.src = ADFIT_SCRIPT;
    script.async = true;
    host.append(ins, script);
    return () => {
      // ba.min.js가 전역에 남기는 등록을 풀어 재마운트 시 중복 요청을 막는다
      (window as unknown as { adfit?: { destroy?: (unit: string) => void } }).adfit?.destroy?.(unit);
      ins.remove();
      script.remove();
    };
  }, [unit]);

  return (
    <div
      ref={ref}
      aria-label="광고"
      style={SIZE}
      className={`mx-auto flex max-w-full items-center justify-center overflow-hidden rounded-xl text-xs text-muted ${unit ? "" : "border border-dashed border-line"}`}
    >
      {!unit && "광고 영역"}
    </div>
  );
}
