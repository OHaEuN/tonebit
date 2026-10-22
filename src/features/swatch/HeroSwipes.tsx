"use client";

import { SEASON_INFO, SEASONS } from "@/features/recommend/palettes";
import { SwatchSmear } from "./SwatchSmear";

/** 시즌마다 대표 립 한 색. 손등에 네 번 쓱 바른 것처럼 겹쳐 놓는다 */
const PICK: Record<(typeof SEASONS)[number], string> = {
  spring: "sp-peachcoral",
  summer: "su-rosepink",
  autumn: "au-terracotta",
  winter: "wi-truered",
};
const LABEL = { spring: "Spring warm", summer: "Summer cool", autumn: "Autumn warm", winter: "Winter cool" } as const;
const FINISH = { spring: "cream", summer: "gloss", autumn: "matte", winter: "cream" } as const;

export function HeroSwipes() {
  return (
    <div aria-label="봄, 여름, 가을, 겨울 네 시즌의 립 색을 손등에 바른 발색" role="img" className="mx-auto w-full max-w-[560px]">
      {SEASONS.map((season, i) => {
        const swatch = SEASON_INFO[season].lips.find((l) => l.id === PICK[season]) ?? SEASON_INFO[season].lips[0];
        const flip = i % 2 === 1;
        return (
          <div key={season} className={`relative ${i ? "-mt-[13%]" : ""}`} style={{ transform: `rotate(${flip ? 3 : -3}deg) scaleX(${flip ? -1 : 1})` }}>
            <SwatchSmear color={swatch.hex} shape="swipe" finish={FINISH[season]} width={600} height={250} seed={11 + i * 7} fluid maxDpr={1.5} />
            <span
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-white/95 md:text-[13px]"
              style={{ left: "22%", transform: `translateY(-50%) scaleX(${flip ? -1 : 1})` }}
            >
              {LABEL[season]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
