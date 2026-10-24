"use client";

import { CHOICE_CHIP } from "@/components/styles";
import { SUBTYPE_LABEL } from "@/features/analysis/explain";
import { SEASON_SUBTYPES } from "@/features/analysis/tone";
import { SEASON_INFO, SEASONS } from "@/features/recommend/palettes";
import type { ExpertDiagnosis } from "./expert";

interface ExpertChoiceProps {
  /** 같은 화면에 두 벌이 있어도 라디오 묶음이 섞이지 않게 */
  name: string;
  value: ExpertDiagnosis | null;
  onChange: (value: ExpertDiagnosis) => void;
}

/** 받아 본 전문가 진단 고르기: 시즌 칩, 고르면 세부 타입 칩(모름 포함) */
export function ExpertChoice({ name, value, onChange }: ExpertChoiceProps) {
  return (
    <div className="space-y-2.5">
      <div role="radiogroup" aria-label="진단받은 시즌" className="flex flex-wrap gap-1.5">
        {SEASONS.map((s) => (
          <label key={s} className="cursor-pointer">
            <input type="radio" name={`${name}-season`} className="peer sr-only" checked={value?.season === s} onChange={() => onChange({ season: s, subtype: null })} />
            <span className={CHOICE_CHIP}>
              {SEASON_INFO[s].label} {SEASON_INFO[s].tone}
            </span>
          </label>
        ))}
      </div>
      {value && (
        <div role="radiogroup" aria-label="진단받은 세부 타입" className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-muted">세부 타입</span>
          {[null, ...SEASON_SUBTYPES[value.season]].map((t) => (
            <label key={t ?? "unknown"} className="cursor-pointer">
              <input type="radio" name={`${name}-subtype`} className="peer sr-only" checked={value.subtype === t} onChange={() => onChange({ ...value, subtype: t })} />
              <span className={CHOICE_CHIP}>{t ? SUBTYPE_LABEL[t] : "모름"}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
