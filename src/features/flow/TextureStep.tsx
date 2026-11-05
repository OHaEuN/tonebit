"use client";

import { track } from "@/features/analytics/track";
import { TEXTURE_LABEL, type Texture } from "@/features/recommend/preference";
import { useTasteStore } from "@/features/recommend/tasteStore";
import { SwatchSmear } from "@/features/swatch/SwatchSmear";
import { useAnalysisStore } from "@/stores/analysisStore";
import { OptionList } from "./OptionList";
import { StepFrame } from "./StepFrame";
import { useToneLabel } from "./useToneLabel";

const TEXTURES: Texture[] = ["glossy", "blur", "any"];

function Visual({ texture }: { texture: Texture }) {
  if (texture === "any") return <span aria-hidden="true" className="block size-9 rounded-full border border-dashed border-fg/30" />;
  return <SwatchSmear color="#C9646E" width={40} height={40} seed={texture === "glossy" ? 5 : 9} finish={texture === "glossy" ? "gloss" : "matte"} />;
}

/** 3단계 좋아하는 질감. 답 하나가 질감 항을 켠다 */
export function TextureStep() {
  const tone = useToneLabel();
  const setStep = useAnalysisStore((s) => s.setStep);
  const setTaste = useTasteStore((s) => s.setTaste);
  const feel = useTasteStore((s) => s.taste.feel);
  return (
    <StepFrame context={tone} index={3} title="어떤 질감을 좋아해요?" body="요즘은 촉촉한 물광과 보송한 블러 둘 다 유행이라, 좋아하는 쪽을 점수에 더해요." onBack={() => window.history.back()}>
      <OptionList
        label="좋아하는 질감"
        options={TEXTURES.map((key) => ({ key, ...TEXTURE_LABEL[key], visual: <Visual texture={key} /> }))}
        onPick={(texture) => {
          setTaste({ texture });
          track({ name: "taste-set", feel: feel ?? "none", texture });
          setStep("pick");
        }}
      />
    </StepFrame>
  );
}
