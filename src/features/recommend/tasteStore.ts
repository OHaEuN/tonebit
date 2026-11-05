"use client";

import { create } from "zustand";
import { activeWeights } from "./harmony";
import { BASE_WEIGHTS, learnWeights, type AxisVector, type Pick, type Taste } from "./preference";

interface TasteState {
  taste: Taste;
  /** 둘 중 고르기에서 모인 선택 */
  picks: Pick[];
  /** 선택으로 배운 가중치. 선택이 없으면 출발값 */
  weights: AxisVector;
  /** 둘 중 고르기에서 끝까지 이긴 립. 안 했으면 null */
  champion: string | null;
  setTaste: (patch: Taste) => void;
  addPick: (pick: Pick) => void;
  setChampion: (id: string | null) => void;
  clearPicks: () => void;
  reset: () => void;
}

/** 취향과 둘 중 고르기 선택. 측정을 다시 해도 남고, 새로고침하면 사라진다 */
export const useTasteStore = create<TasteState>((set, get) => ({
  taste: {},
  picks: [],
  weights: BASE_WEIGHTS,
  champion: null,
  setTaste: (patch) => set({ taste: { ...get().taste, ...patch } }),
  setChampion: (champion) => set({ champion }),
  addPick: (pick) => {
    const picks = [...get().picks, pick];
    // 취향을 안 답해 꺼진 항목(가중치 0)은 배우지 않는다
    set({ picks, weights: learnWeights(activeWeights(BASE_WEIGHTS, get().taste), picks) });
  },
  clearPicks: () => set({ picks: [], weights: BASE_WEIGHTS, champion: null }),
  reset: () => set({ taste: {}, picks: [], weights: BASE_WEIGHTS, champion: null }),
}));
