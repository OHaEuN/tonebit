"use client";

import { useEffect, useState } from "react";
import type { Tally } from "./stats";

/** 한 번 불러오면 이 방문 동안 다시 묻지 않는다. 보낸 직후에는 refresh로 다시 읽는다 */
let pending: Promise<Tally | null> | null = null;

function load(): Promise<Tally | null> {
  pending ??= fetch("/api/feedback/count")
    .then((res) => (res.ok ? (res.json() as Promise<Tally>) : null))
    .catch(() => null);
  return pending;
}

/** 모인 전문가 진단 건수. 저장소가 꺼져 있거나 못 읽으면 null */
export function useFeedbackProgress(version = 0): Tally | null {
  const [tally, setTally] = useState<Tally | null>(null);
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_FEEDBACK_ENABLED) return;
    if (version > 0) pending = null;
    let alive = true;
    void load().then((t) => alive && setTally(t));
    return () => {
      alive = false;
    };
  }, [version]);
  return tally;
}
