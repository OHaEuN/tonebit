import { create } from "zustand";
import { track } from "@/features/analytics/track";
import type { LightingIssue, ToneResult } from "@/types/analysis";
import type { BlendPreset } from "@/features/lipTryOn/render";

export type Stage = "setup" | "live" | "measuring" | "done";
export type Source = "camera" | "image";

interface AnalysisState {
  stage: Stage;
  source: Source | null;
  lighting: LightingIssue[];
  faceFound: boolean;
  /** 측정 진행률 0~1 */
  progress: number;
  result: ToneResult | null;
  lipId: string | null;
  blushId: string | null;
  blend: BlendPreset;
  debug: boolean;
  fps: number;

  begin: (source: Source) => void;
  startMeasuring: () => void;
  setLighting: (issues: LightingIssue[]) => void;
  setFaceFound: (found: boolean) => void;
  setProgress: (p: number) => void;
  finish: (result: ToneResult) => void;
  /** 같은 소스로 다시 측정. 카메라는 그대로 켜 둔다 */
  remeasure: () => void;
  selectLip: (id: string | null) => void;
  selectBlush: (id: string | null) => void;
  setBlend: (b: BlendPreset) => void;
  setDebug: (on: boolean) => void;
  setFps: (fps: number) => void;
  reset: () => void;
}

const initial = {
  stage: "setup" as Stage,
  source: null,
  lighting: [],
  faceFound: false,
  progress: 0,
  result: null,
  lipId: null,
  blushId: null,
  blend: "natural" as BlendPreset,
  debug: false,
  fps: 0,
};

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  ...initial,
  begin: (source) => set({ ...initial, source, stage: "live" }),
  startMeasuring: () => set({ stage: "measuring", progress: 0 }),
  setLighting: (lighting) => set({ lighting }),
  setFaceFound: (faceFound) => set({ faceFound }),
  setProgress: (progress) => set({ progress }),
  finish: (result) => {
    track({ name: "measure-done", tone: result.tone, confidence: result.confidence, source: get().source ?? "camera" });
    set({ result, stage: "done", progress: 1 });
  },
  remeasure: () => set({ stage: "live", result: null, lipId: null, blushId: null, progress: 0 }),
  selectLip: (lipId) => {
    if (lipId) track({ name: "swatch-select", kind: "lip", product: lipId.startsWith("lip-") });
    set({ lipId });
  },
  selectBlush: (blushId) => {
    if (blushId) track({ name: "swatch-select", kind: "blush", product: blushId.startsWith("blush-") });
    set({ blushId });
  },
  setBlend: (blend) => set({ blend }),
  setDebug: (debug) => set({ debug }),
  setFps: (fps) => set({ fps }),
  reset: () => set(initial),
}));
