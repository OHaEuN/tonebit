"use client";

import type { Swatch } from "@/types/product";
import { SwatchSmear } from "@/features/swatch/SwatchSmear";

interface PaletteBandProps {
  swatches: Swatch[];
  /** 자국 하나의 지름(px) */
  size?: number;
  className?: string;
}

/** 시즌 팔레트를 팔레트에 짜 놓은 물감처럼 살짝 겹쳐 찍은 발색 줄 */
export function PaletteBand({ swatches, size = 44, className = "" }: PaletteBandProps) {
  return (
    <div role="img" aria-label={`팔레트: ${swatches.map((s) => s.name).join(", ")}`} className={`flex ${className}`}>
      {swatches.map((s, i) => (
        <SwatchSmear key={s.id} color={s.hex} width={size} height={size} seed={i + 3} finish={i % 3 === 1 ? "gloss" : "cream"} className={i ? "-ml-1.5" : ""} />
      ))}
    </div>
  );
}
