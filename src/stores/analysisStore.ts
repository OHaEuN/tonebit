import { create } from "zustand";
import { track } from "@/features/analytics/track";
import type { LightingIssue, LinearRgb, Season, ToneResult } from "@/types/analysis";
import { combineShots, MAX_SHOTS, shotResult, type SeasonVotes, type Shot } from "@/features/analysis/shots";
import { DEFAULT_INTENSITY, type BlushStyle, type LipStyle } from "@/features/lipTryOn/render";
import type { ExpertDiagnosis } from "@/features/feedback/expert";

export type Stage = "setup" | "live" | "measuring" | "done";
export type Source = "camera" | "image";
/** 결과 화면 탭. 발라 보기에서만 사진을 화면 위에 고정한다 */
export type ResultTab = "result" | "tryon";

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
  /** 실시간 카메라에서 화이트밸런스를 고정할 때 잰 흰 종이. 카메라를 끄면 사라진다 */
  lockedWhite: LinearRgb | null;
  resultTab: ResultTab;
  /** 시작 화면에서 고른 전문가 진단. 결과에서 톤빛 판정과 견준다. 다시 찍어도 남는다 */
  expert: ExpertDiagnosis | null;
  /** 이번 방문에서 전문가 진단을 이미 보냈는지. 같은 사람이 두 번 세지 않게 */
  expertSent: boolean;

  begin: (source: Source) => void;
  startMeasuring: () => void;
  setLighting: (issues: LightingIssue[]) => void;
  setFaceFound: (found: boolean) => void;
  setProgress: (p: number) => void;
  /** 사진 한 장(또는 카메라 측정 한 번)을 더해 다시 판정한다. 붙인 id를 돌려준다 */
  addShot: (shot: Omit<Shot, "id">) => number;
  /** 한 장의 측정값을 바꿔(흰색 기준 보정 등) 다시 합친다. 보고 있던 화면은 유지한다 */
  updateShot: (id: number, patch: Partial<Omit<Shot, "id">>) => void;
  /** 꾹 눌러 바르기 전 모습을 보는 중 */
  comparing: boolean;
  setComparing: (on: boolean) => void;
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
  setLockedWhite: (white: LinearRgb | null) => void;
  setResultTab: (tab: ResultTab) => void;
  setExpert: (expert: ExpertDiagnosis | null) => void;
  markExpertSent: () => void;
  reset: () => void;
}

const initial = {
  stage: "setup" as Stage,
  source: null,
  lighting: [],
  faceFound: false,
  progress: 0,
  result: null,
  comparing: false,
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
  lockedWhite: null,
  resultTab: "result" as ResultTab,
};

let shotSeq = 0;

/** 처음부터 다시 해도 이용자가 알려 준 전문가 진단과 보냈는지는 남긴다 */
const keepExpert = (s: AnalysisState) => ({ expert: s.expert, expertSent: s.expertSent });

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  ...initial,
  expert: null,
  expertSent: false,
  begin: (source) => set({ ...initial, ...keepExpert(get()), source, stage: "live" }),
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
  updateShot: (id, patch) => {
    const shots = get().shots.map((s) => (s.id === id ? { ...s, ...patch } : s));
    const { result: combined, votes } = combineShots(shots);
    const view = get().view;
    const shot = view === null ? undefined : shots.find((s) => s.id === view);
    set({ shots, votes, combined, result: shot ? shotResult(shot) : combined });
  },
  setComparing: (comparing) => set({ comparing }),
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
  setLockedWhite: (lockedWhite) => set({ lockedWhite }),
  setResultTab: (resultTab) => set({ resultTab }),
  setExpert: (expert) => set({ expert }),
  markExpertSent: () => set({ expertSent: true }),
  reset: () => set({ ...initial, ...keepExpert(get()) }),
}));
