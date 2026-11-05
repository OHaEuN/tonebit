"use client";

import { useMemo, useState } from "react";
import { track } from "@/features/analytics/track";
import { renderFaceCrop } from "@/features/lipTryOn/faceCrop";
import { useAnalysisStore } from "@/stores/analysisStore";
import { productById } from "./getProducts";
import type { RankedItem } from "./harmony";
import { useLipRanking, type LipCandidate } from "./useLipRanking";
import { BRACKET_SIZE, champion, currentMatch, matchLabel, pickContenders, pickWinner, progress, shuffle, startBracket, type Bracket } from "./worldCup";

/** 비교 그림 한 장의 가로 픽셀. 휴대폰 2열(약 180css px × 3배)에서도 선명하게 */
const CROP_WIDTH = 720;

export interface Contender {
  ranked: RankedItem<LipCandidate>;
  /** AI 순위(1부터) */
  rank: number;
  /** 이 립을 바른 얼굴(data URL). 기기 안에서만 만든다 */
  crop: string;
  url?: string;
}

export interface WorldCupOutcome {
  mine: Contender;
  ai: Contender;
  same: boolean;
}

export interface LipWorldCupOptions {
  /** 토너먼트 인원. 기본 16 */
  size?: number;
  /** 한 번 고를 때마다 이긴 쪽과 진 쪽 */
  onChoose?: (winner: RankedItem<LipCandidate>, loser: RankedItem<LipCandidate>) => void;
}

export interface LipWorldCupState {
  /** 후보가 둘 이상 있어 시작할 수 있다 */
  ready: boolean;
  started: boolean;
  total: number;
  label: string;
  progress: number;
  match: [Contender, Contender] | null;
  outcome: WorldCupOutcome | null;
  start: () => void;
  choose: (id: string) => void;
}

type Entry = { r: RankedItem<LipCandidate>; rank: number; hex: string };

/**
 * 립 월드컵: 순위 상위의 서로 다른 색을 내 얼굴에 바른 그림으로 토너먼트를 한다.
 * 고르는 쪽은 이용자라 측정 정확도와 무관하고, 끝나면 AI 1등과 나란히 본다.
 * 선택할 때마다 가중치가 다시 배워져 순위가 바뀌므로, 후보는 시작할 때 고정한다
 */
export function useLipWorldCup({ size = BRACKET_SIZE, onChoose }: LipWorldCupOptions = {}): LipWorldCupState {
  const snapshot = useAnalysisStore((s) => s.snapshot);
  const ranking = useLipRanking();
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [pool, setPool] = useState<Entry[] | null>(null);

  const products = useMemo(
    () => (ranking ? ranking.ranked.map((r, i) => ({ r, rank: i + 1 })).filter(({ r }) => r.item.kind === "product") : []),
    [ranking],
  );
  const contenders = useMemo(() => pool ?? pickContenders(products.map((p) => ({ ...p, hex: p.r.item.hex })), size), [pool, products, size]);

  const pair = bracket ? currentMatch(bracket) : null;
  const winner = bracket ? champion(bracket) : null;
  const aiBest = products[0]?.r.item.id;
  const [idA, idB] = pair ?? [];

  const find = (id: string) => contenders.find((c) => c.r.item.id === id) ?? products.find((p) => p.r.item.id === id) ?? products[0];

  /** 지금 화면에 보이는 얼굴 그림만 그린다(대결 둘 또는 결과 둘). 같은 제품이 다음 라운드에 다시 나오면 다시 그리는데 몇십 ms라 괜찮다 */
  const crops = useMemo(() => {
    const map = new Map<string, string>();
    if (!snapshot) return map;
    const ids = winner ? [winner, aiBest] : [idA, idB];
    for (const id of ids) {
      if (!id || map.has(id)) continue;
      const { item } = find(id).r;
      map.set(id, renderFaceCrop(snapshot, item.hex, item.finish, CROP_WIDTH).toDataURL("image/jpeg", 0.9));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- find는 contenders·products에서만 나온다
  }, [snapshot, winner, aiBest, idA, idB, contenders, products]);

  const side = (id: string): Contender => {
    const found = find(id);
    return { ranked: found.r, rank: found.rank, crop: crops.get(id) ?? "", url: productById(id)?.url };
  };

  return {
    ready: Boolean(snapshot) && contenders.length >= 2,
    started: bracket !== null,
    total: contenders.length,
    label: bracket ? matchLabel(bracket) : "",
    progress: bracket ? progress(bracket, Math.min(size, contenders.length)) : 0,
    match: pair ? [side(pair[0]), side(pair[1])] : null,
    outcome: winner && aiBest ? { mine: side(winner), ai: side(aiBest), same: winner === aiBest } : null,
    start: () => {
      setPool(contenders);
      setBracket(startBracket(shuffle(contenders.map((c) => c.r.item.id))));
    },
    choose: (id) => {
      if (!bracket || !pair) return;
      const loserId = pair[0] === id ? pair[1] : pair[0];
      onChoose?.(find(id).r, find(loserId).r);
      const next = pickWinner(bracket, id);
      const done = champion(next);
      if (done) track({ name: "worldcup-done", same: done === aiBest });
      setBracket(next);
    },
  };
}
