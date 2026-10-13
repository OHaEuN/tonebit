"use client";

import { useSyncExternalStore } from "react";

const MOBILE_UA = /iPhone|iPad|iPod|Android/i;
const noop = () => () => {};

/** 서버 렌더는 false, 클라이언트는 UA로 판단. useSyncExternalStore라 하이드레이션 경고 없이 바뀐다 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    noop,
    () => MOBILE_UA.test(navigator.userAgent),
    () => false,
  );
}
