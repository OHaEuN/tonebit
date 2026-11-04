"use client";

import { useMemo } from "react";
import { chroma, hexToLab } from "@/features/analysis/color";
import { renderFaceCrop } from "@/features/lipTryOn/faceCrop";
import { productById } from "@/features/recommend/getProducts";
import { useAnalysisStore } from "@/stores/analysisStore";
import { useLipRanking, type LipCandidate } from "./useLipRanking";
import type { RankedItem } from "./harmony";

export interface FaceOffSide {
  ranked: RankedItem<LipCandidate>;
  /** 전체 순위(1부터) */
  rank: number;
  /** 립을 얹은 얼굴 그림(data URL). 기기 안에서만 만든다 */
  crop: string;
  /** 쿠팡 링크. 제품일 때만 */
  url?: string;
}

export interface LipFaceOff {
  worst: FaceOffSide;
  best: FaceOffSide;
  total: number;
}

/** 비교 그림 한 장의 가로 픽셀 */
const CROP_WIDTH = 480;
/** 꼴찌 후보는 이 채도(C*)는 되고 이 밝기(L*)보다는 어두워야 한다. 거의 투명한 연한 밤은 발라도 차이가 안 보여 비교가 싱겁다 */
const WORST_MIN_CHROMA = 18;
const WORST_MAX_LIGHTNESS = 68;

/**
 * 실제 제품 중 가장 안 어울리는 립과 가장 어울리는 립을 내 얼굴에 얹어 나란히 놓는다.
 * 스냅샷은 브라우저에서만 생기므로(서버에선 null) 캔버스 작업이 렌더 중에 돌아도 안전하다
 */
export function useLipFaceOff(): LipFaceOff | null {
  const snapshot = useAnalysisStore((s) => s.snapshot);
  const ranking = useLipRanking();

  return useMemo(() => {
    if (!snapshot || !ranking) return null;
    const products = ranking.ranked.map((r, i) => ({ r, rank: i + 1 })).filter(({ r }) => r.item.kind === "product");
    const vivid = products.filter(({ r }) => {
      const lab = hexToLab(r.item.hex);
      return chroma(lab) >= WORST_MIN_CHROMA && lab.L <= WORST_MAX_LIGHTNESS;
    });
    const worst = vivid.at(-1) ?? products.at(-1);
    if (products.length < 2 || !worst || worst === products[0]) return null;
    const side = ({ r, rank }: (typeof products)[number]): FaceOffSide => ({
      ranked: r,
      rank,
      crop: renderFaceCrop(snapshot, r.item.hex, r.item.finish, CROP_WIDTH).toDataURL("image/jpeg", 0.9),
      url: productById(r.item.id)?.url,
    });
    return {
      best: side(products[0]),
      worst: side(worst),
      total: products.length,
    };
  }, [snapshot, ranking]);
}
