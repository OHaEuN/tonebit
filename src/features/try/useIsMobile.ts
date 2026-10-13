"use client";

import { useSyncExternalStore } from "react";

// 인앱 브라우저(카카오톡·인스타 등)나 구형 기기도 잡도록 넓게. Mobi는 대부분의 모바일 UA에 들어간다
const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobi|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile|Silk|KAKAOTALK|NAVER|Line\//i;
// 손가락이 주 입력이고 마우스 호버가 없는 기기. 데스크톱 모드로 UA를 바꾼 폰도 여기서 잡힌다
const TOUCH_ONLY = "(pointer: coarse) and (hover: none)";

interface NavigatorUAData {
  mobile?: boolean;
}

function detectMobile(): boolean {
  const nav = navigator as Navigator & { userAgentData?: NavigatorUAData };
  if (nav.userAgentData?.mobile) return true;
  const ua = nav.userAgent;
  if (MOBILE_UA.test(ua)) return true;
  // iPadOS 13+ Safari는 UA가 Mac과 같아서 터치 포인트 수로 구분한다
  if (/Macintosh/i.test(ua) && nav.maxTouchPoints > 1) return true;
  return typeof window.matchMedia === "function" && window.matchMedia(TOUCH_ONLY).matches;
}

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const mql = window.matchMedia(TOUCH_ONLY);
  mql.addEventListener?.("change", onChange);
  return () => mql.removeEventListener?.("change", onChange);
}

/** 서버 렌더는 false, 클라이언트는 UA·Client Hints·터치 입력으로 판단. useSyncExternalStore라 하이드레이션 경고 없이 바뀐다 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, detectMobile, () => false);
}
