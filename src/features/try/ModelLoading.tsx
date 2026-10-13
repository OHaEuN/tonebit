"use client";

import { useEffect, useState } from "react";
import type { LoadProgress } from "@/features/landmark/useFaceLandmarker";
import { SEASON_INFO, SEASONS } from "@/features/recommend/palettes";

/** 기다리는 동안 돌아가며 보여줄 한 줄. 촬영 팁과 퍼스널 컬러 상식을 섞는다 */
const TIPS = [
  "창가 자연광 아래에서 찍으면 피부색이 가장 정확하게 잡혀요.",
  "웜톤은 피부에 노란 기, 쿨톤은 푸른 기가 살짝 돌아요.",
  "봄·여름·가을·겨울 네 시즌을 다시 12가지 세부 톤으로 나눠서 봐요.",
  "화장을 지우고 찍으면 원래 피부 톤이 더 잘 보여요.",
  "머리카락이 이마와 볼을 가리지 않게 넘겨 주세요.",
  "한 번 받아두면 다음부터는 바로 열려요.",
];
const TIP_INTERVAL_MS = 3500;

function mb(bytes: number) {
  return (bytes / 1_000_000).toFixed(1);
}

interface ModelLoadingProps {
  progress: LoadProgress | null;
}

/** 얼굴 인식 모듈을 받는 동안 진행률, 단계, 팁을 보여줘서 멈춘 게 아니라는 걸 알 수 있게 한다 */
export function ModelLoading({ progress }: ModelLoadingProps) {
  const [tip, setTip] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTip((i) => (i + 1) % TIPS.length), TIP_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const init = progress?.phase === "init";
  const percent = Math.round((progress?.ratio ?? 0) * 100);
  const label = init ? "얼굴 인식 엔진을 켜는 중이에요" : progress ? "얼굴 인식 모듈을 받는 중이에요" : "얼굴 인식 모듈을 준비하는 중이에요";

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-card p-5">
      <div aria-hidden="true" className="flex justify-center gap-2.5 pt-2">
        {SEASONS.map((s, i) => (
          <span
            key={s}
            className="swatch-wave size-7 rounded-full shadow-[0_6px_14px_-8px_rgba(23,19,17,0.6)]"
            style={{ background: SEASON_INFO[s].accent, ["--delay" as string]: `${i * 140}ms` }}
          />
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <p role="status" aria-live="polite" className="font-medium">
            {label}
          </p>
          <p className="shrink-0 tabular-nums text-muted">{init ? "거의 다 됐어요" : `${percent}%`}</p>
        </div>
        <div
          role="progressbar"
          aria-label="얼굴 인식 모듈 준비"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={init ? 100 : percent}
          className="h-2 overflow-hidden rounded-full bg-black/10"
        >
          <div className={`h-full bg-accent transition-[width] duration-300 ${init ? "bar-shimmer" : ""}`} style={{ width: `${init ? 100 : Math.max(percent, 3)}%` }} />
        </div>
        <p className="text-xs tabular-nums text-muted">
          {progress && !init ? `${mb(progress.loadedBytes)} / ${mb(progress.totalBytes)}MB · 처음 한 번만 받아요` : "처음 한 번만 받아요 (약 17MB)"}
        </p>
      </div>

      <p key={tip} className="tip-in min-h-10 text-sm text-muted">
        <span className="mr-1.5 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">TIP</span>
        {TIPS[tip]}
      </p>
    </div>
  );
}
