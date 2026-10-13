import { create } from "zustand";
import { track } from "@/features/analytics/track";
import type { LightingIssue, Season, ToneResult } from "@/types/analysis";
import { combineShots, MAX_SHOTS, shotResult, type SeasonVotes, type Shot } from "@/features/analysis/shots";
import { DEFAULT_INTENSITY, type BlushStyle, type LipStyle } from "@/features/lipTryOn/render";

export type Stage = "setup" | "live" | "measuring" | "done";
export type Source = "camera" | "image";

interface AnalysisState {
  stage: Stage;
  source: Source | null;
  lighting: LightingIssue[];
  faceFound: boolean;
  /** 측정 진행률 0~1 */
  progress: number;
  /** 화면에 보여 주는 판정. view가 null이면 합친 결과, 아니면 그 사진 한 장의 결과 */
  result: ToneResult | null;
  /** 모든 사진·측정을 합친 판정 */
  combined: ToneResult | null;
  /** 보고 있는 사진(shot id). null이면 합친 결과 */
  view: number | null;
  /** 합쳐서 판정한 사진·측정들. 합친 결과는 이들의 중앙값이다 */
  shots: Shot[];
  /** 장별 시즌 집계. 갈렸는지 보여 줄 때 쓴다 */
  votes: SeasonVotes;
  lipId: string | null;
  blushId: string | null;
  lipStyle: LipStyle;
  blushStyle: BlushStyle;
  /** 발색 진하기 0~1. 립과 블러셔 따로 */
  lipIntensity: number;
  blushIntensity: number;
  /** 발라볼 팔레트의 시즌. null이면 진단된 시즌 */
  paletteSeason: Season | null;
  debug: boolean;
  fps: number;

  begin: (source: Source) => void;
  startMeasuring: () => void;
  setLighting: (issues: LightingIssue[]) => void;
  setFaceFound: (found: boolean) => void;
  setProgress: (p: number) => void;
  /** 사진 한 장(또는 카메라 측정 한 번)을 더해 다시 판정한다. 붙인 id를 돌려준다 */
  addShot: (shot: Omit<Shot, "id">) => number;
  /** 합친 결과(null) 또는 사진 한 장의 결과를 본다 */
  setView: (id: number | null) => void;
  /** 카메라로 한 번 더 측정한다. 지금까지의 측정은 유지한다 */
  measureMore: () => void;
  /** 같은 소스로 다시 측정. 카메라는 그대로 켜 둔다 */
  remeasure: () => void;
  selectLip: (id: string | null) => void;
  selectBlush: (id: string | null) => void;
  setLipStyle: (s: LipStyle) => void;
  setBlushStyle: (s: BlushStyle) => void;
  setLipIntensity: (v: number) => void;
  setBlushIntensity: (v: number) => void;
  setPaletteSeason: (s: Season | null) => void;
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
  combined: null,
  view: null,
  shots: [] as Shot[],
  votes: {} as SeasonVotes,
  lipId: null,
  blushId: null,
  lipStyle: "full" as LipStyle,
  blushStyle: "cheekbone" as BlushStyle,
  lipIntensity: DEFAULT_INTENSITY,
  blushIntensity: DEFAULT_INTENSITY,
  paletteSeason: null,
  debug: false,
  fps: 0,
};

let shotSeq = 0;

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  ...initial,
  begin: (source) => set({ ...initial, source, stage: "live" }),
  startMeasuring: () => set({ stage: "measuring", progress: 0 }),
  setLighting: (lighting) => set({ lighting }),
  setFaceFound: (faceFound) => set({ faceFound }),
  setProgress: (progress) => set({ progress }),
  addShot: (shot) => {
    const id = ++shotSeq;
    const shots = [...get().shots, { ...shot, id }].slice(-MAX_SHOTS);
    const { result, votes } = combineShots(shots);
    track({ name: "measure-done", tone: result.tone, confidence: result.confidence, source: get().source ?? "camera" });
    set({ shots, votes, result, combined: result, view: null, stage: "done", progress: 1 });
    return id;
  },
  setView: (view) => {
    const { shots, combined } = get();
    const shot = view === null ? undefined : shots.find((s) => s.id === view);
    set({ view: shot ? view : null, result: shot ? shotResult(shot) : combined, paletteSeason: null });
  },
  measureMore: () => set({ stage: "live", progress: 0 }),
  remeasure: () => set({ stage: "live", result: null, combined: null, view: null, shots: [], votes: {}, lipId: null, blushId: null, paletteSeason: null, progress: 0 }),
  selectLip: (lipId) => {
    if (lipId) track({ name: "swatch-select", kind: "lip", product: lipId.startsWith("lip-") });
    set({ lipId });
  },
  selectBlush: (blushId) => {
    if (blushId) track({ name: "swatch-select", kind: "blush", product: blushId.startsWith("blush-") });
    set({ blushId });
  },
  setLipStyle: (lipStyle) => set({ lipStyle }),
  setBlushStyle: (blushStyle) => set({ blushStyle }),
  setLipIntensity: (lipIntensity) => set({ lipIntensity }),
  setBlushIntensity: (blushIntensity) => set({ blushIntensity }),
  setPaletteSeason: (paletteSeason) => set({ paletteSeason }),
  setDebug: (debug) => set({ debug }),
  setFps: (fps) => set({ fps }),
  reset: () => set(initial),
}));
