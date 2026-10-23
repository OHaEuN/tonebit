"use client";

import { useState } from "react";
import { BUTTON } from "@/components/styles";
import { ApplyControls } from "@/features/lipTryOn/ApplyControls";
import { ColorPicker } from "@/features/lipTryOn/ColorPicker";
import { BLUSH_STYLES, LIP_STYLES } from "@/features/lipTryOn/render";
import { ShadeScanner } from "@/features/myShade/ShadeScanner";
import { DrapeCompare } from "@/features/recommend/DrapeCompare";
import { HarmonyLine } from "@/features/recommend/HarmonyLine";
import { useAnalysisStore } from "@/stores/analysisStore";
import { PaletteSeasonPicker } from "./PaletteSeasonPicker";
import { TryOnBar } from "./TryOnBar";
import { useTrySwatches, type Part } from "./useTrySwatches";

const PARTS: [Part, string][] = [
  ["lip", "립"],
  ["blush", "블러셔"],
];

interface TryOnControlsProps {
  onShowResult: () => void;
}

/** 발라 보기: 팔레트 시즌, 립/블러셔 전환, 색·바르는 방법·진하기, 내 톤 고르기, 내 제품 색 재기 */
export function TryOnControls({ onShowResult }: TryOnControlsProps) {
  const [part, setPart] = useState<Part>("lip");
  const result = useAnalysisStore((s) => s.result)!;
  const lipId = useAnalysisStore((s) => s.lipId);
  const blushId = useAnalysisStore((s) => s.blushId);
  const lipStyle = useAnalysisStore((s) => s.lipStyle);
  const blushStyle = useAnalysisStore((s) => s.blushStyle);
  const lipIntensity = useAnalysisStore((s) => s.lipIntensity);
  const blushIntensity = useAnalysisStore((s) => s.blushIntensity);
  const paletteSeason = useAnalysisStore((s) => s.paletteSeason);
  const selectLip = useAnalysisStore((s) => s.selectLip);
  const selectBlush = useAnalysisStore((s) => s.selectBlush);
  const setLipStyle = useAnalysisStore((s) => s.setLipStyle);
  const setBlushStyle = useAnalysisStore((s) => s.setBlushStyle);
  const setLipIntensity = useAnalysisStore((s) => s.setLipIntensity);
  const setBlushIntensity = useAnalysisStore((s) => s.setBlushIntensity);
  const setPaletteSeason = useAnalysisStore((s) => s.setPaletteSeason);
  const sections = useTrySwatches(part);

  const { season } = result;
  const shown = paletteSeason ?? season;
  const isLip = part === "lip";

  return (
    // 모바일은 사진 무대가 위에 고정돼 있어서, 칩이 스크롤로 화면에 들어올 때(키보드 이동 등) 사진 밑에 가리지 않게 그 높이만큼 여백을 둔다
    <div className="space-y-6 [&_*]:scroll-mt-[calc(min(50svh,480px)+16px)] md:[&_*]:scroll-mt-6">
      <div role="tablist" aria-label="바를 곳" className="grid grid-cols-2 gap-1 rounded-[8px] bg-card p-1">
        {PARTS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={part === key}
            onClick={() => setPart(key)}
            className={`h-10 rounded-[6px] text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg ${
              part === key ? "bg-fg text-white" : "text-muted hover:text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <PaletteSeasonPicker mine={season} shown={shown} onChange={setPaletteSeason} />

      <ColorPicker
        key={part}
        name={part}
        label={isLip ? "립" : "블러셔"}
        sections={sections}
        value={isLip ? lipId : blushId}
        onChange={isLip ? selectLip : selectBlush}
      />
      {isLip && <HarmonyLine lipId={lipId} />}
      {isLip ? (
        <ApplyControls name="립" styles={LIP_STYLES} style={lipStyle} onStyle={setLipStyle} intensity={lipIntensity} onIntensity={setLipIntensity} />
      ) : (
        <ApplyControls name="블러셔" styles={BLUSH_STYLES} style={blushStyle} onStyle={setBlushStyle} intensity={blushIntensity} onIntensity={setBlushIntensity} />
      )}

      <div className="border-b border-line">
        {isLip && <DrapeCompare />}
        <ShadeScanner category={part} onSaved={isLip ? selectLip : selectBlush} />
      </div>

      <p className="text-xs leading-relaxed text-muted">
        사진 오른쪽 아래 전후 버튼이나 사진을 꾹 누르고 있으면 바르기 전 모습이 보여요. 제품 색은 공식 색상명 기준 근사치이고, 내 제품은 흰 종이로 잰 색이에요.
      </p>
      <button type="button" onClick={onShowResult} className={BUTTON.text}>
        결과로 돌아가기
      </button>
      <TryOnBar part={part} selectedId={isLip ? lipId : blushId} />
    </div>
  );
}
