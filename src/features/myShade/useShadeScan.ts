"use client";

import { useCallback, useState } from "react";
import type { LinearRgb } from "@/types/analysis";
import type { ProductCategory } from "@/types/product";
import { STILL_ANALYSIS_WIDTH, WHITE_PATCH_RATIO } from "@/features/analysis/constants";
import { createOffscreen, fitSize, patchAt } from "@/features/analysis/frame";
import { checkWhitePatch } from "@/features/analysis/whitePoint";
import { linearToHex } from "@/features/lipTryOn/tint";
import { loadImage } from "@/features/try/loadImage";
import { swatchColor, swatchReflectance } from "./measure";
import { useMyShadeStore } from "./store";

export type ScanStep = "photo" | "paper" | "swatch" | "done";

export interface ScanMark {
  u: number;
  v: number;
}

const ERRORS = {
  dark: "종이가 아닌 것 같아요. 흰 종이에서 아무것도 안 칠한 곳을 눌러 주세요",
  clipped: "너무 밝아서 하얗게 날아간 곳이에요. 그늘이 살짝 진 종이를 눌러 주세요",
  colored: "색이 있는 곳이에요. 흰 종이에서 아무것도 안 칠한 곳을 눌러 주세요",
  brighter: "종이와 밝기가 비슷해요. 진하게 칠한 가운데를 눌러 주세요",
  noColor: "색이 거의 없는 곳이에요. 칠한 곳을 눌러 주세요",
  empty: "색을 읽지 못했어요. 칠한 곳을 다시 눌러 주세요",
} as const;

/**
 * 내 제품 색 재기: 흰 종이에 바른 사진을 올리고 → 종이를 누르고 → 칠한 곳을 누른다.
 * 사진은 이 기기에서만 쓰고 저장하지 않는다. 남는 건 색 hex뿐이다
 */
export function useShadeScan() {
  const add = useMyShadeStore((s) => s.add);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [step, setStep] = useState<ScanStep>("photo");
  const [paper, setPaper] = useState<{ white: LinearRgb; mark: ScanMark } | null>(null);
  const [swatch, setSwatch] = useState<{ hex: string; mark: ScanMark } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setImage(null);
    setStep("photo");
    setPaper(null);
    setSwatch(null);
    setError(null);
  }, []);

  const load = useCallback(async (file: File) => {
    reset();
    try {
      setImage(await loadImage(file));
      setStep("paper");
    } catch {
      setError("사진을 열지 못했어요. 다른 사진으로 해 주세요");
    }
  }, [reset]);

  /** 사진의 (u, v)를 누름. 단계에 따라 종이 또는 칠한 곳으로 잰다 */
  const tap = useCallback(
    (u: number, v: number) => {
      if (!image || step === "photo") return;
      const { w, h } = fitSize(image.naturalWidth, image.naturalHeight, STILL_ANALYSIS_WIDTH);
      const ctx = createOffscreen(w, h, true);
      ctx.drawImage(image, 0, 0, w, h);
      const pixels = patchAt(ctx, u, v, w * WHITE_PATCH_RATIO);
      const mark = { u, v };
      if (step === "paper") {
        const check = checkWhitePatch(pixels);
        if ("error" in check) return setError(ERRORS[check.error]);
        setPaper({ white: check.white, mark });
        setSwatch(null);
        setError(null);
        setStep("swatch");
        return;
      }
      const color = paper && swatchColor(pixels);
      if (!paper || !color) return setError(ERRORS.empty);
      const check = swatchReflectance(color, paper.white);
      if ("error" in check) return setError(ERRORS[check.error]);
      setSwatch({ hex: linearToHex(check.color), mark });
      setError(null);
      setStep("done");
    },
    [image, step, paper],
  );

  /** 종이부터 다시 누른다 */
  const repick = useCallback(() => {
    setPaper(null);
    setSwatch(null);
    setError(null);
    setStep(image ? "paper" : "photo");
  }, [image]);

  const save = useCallback(
    (name: string, category: ProductCategory) => {
      if (!swatch) return null;
      const id = add({ name: name.trim() || "내 제품", hex: swatch.hex, category });
      reset();
      return id;
    },
    [add, reset, swatch],
  );

  return { image, step, paper: paper?.mark ?? null, swatch, error, load, tap, repick, save, reset };
}
