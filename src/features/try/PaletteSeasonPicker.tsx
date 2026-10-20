"use client";

import type { Season } from "@/types/analysis";
import { SEASON_INFO, SEASONS } from "@/features/recommend/palettes";

interface PaletteSeasonPickerProps {
  /** 진단된 시즌 */
  mine: Season;
  /** 지금 보여 주는 팔레트의 시즌 */
  shown: Season;
  /** 진단된 시즌으로 돌아가면 null */
  onChange: (season: Season | null) => void;
}

/** 발라 볼 팔레트의 시즌 고르기. 내 톤이 아닌 시즌 색과도 비교해 본다 */
export function PaletteSeasonPicker({ mine, shown, onChange }: PaletteSeasonPickerProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-medium">
        팔레트
        <span className="ml-2 font-normal text-muted">다른 시즌 색과 비교해 보세요</span>
      </legend>
      <div className="relative -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {SEASONS.map((s) => {
          const info = SEASON_INFO[s];
          return (
            <label key={s} className="shrink-0 cursor-pointer">
              <input
                type="radio"
                name="palette-season"
                className="peer sr-only"
                checked={s === shown}
                onChange={() => onChange(s === mine ? null : s)}
              />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm peer-checked:border-fg peer-checked:bg-fg peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2">
                <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: info.accent }} />
                {info.label} {info.tone}
                {s === mine && <span className="text-xs opacity-70">내 톤</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
