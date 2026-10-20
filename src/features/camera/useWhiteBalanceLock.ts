"use client";

import { useCallback, useState, type RefObject } from "react";
import { LOCK_SAMPLE_RATIO, LOCK_SETTLE_MS } from "@/features/analysis/constants";
import { createOffscreen } from "@/features/analysis/frame";
import { track } from "@/features/analytics/track";
import { checkWhitePatch } from "@/features/analysis/whitePoint";
import { useAnalysisStore } from "@/stores/analysisStore";

/** whiteBalanceMode는 Image Capture 확장 제약이라 TS DOM 타입에 없다 */
type WhiteBalanceMode = "none" | "manual" | "single-shot" | "continuous";
interface WhiteBalanceCapabilities {
  whiteBalanceMode?: WhiteBalanceMode[];
}
interface WhiteBalanceSettings {
  whiteBalanceMode?: WhiteBalanceMode;
}

function capabilities(camera: MediaStreamTrack): WhiteBalanceCapabilities {
  return typeof camera.getCapabilities === "function" ? (camera.getCapabilities() as WhiteBalanceCapabilities) : {};
}

async function setMode(camera: MediaStreamTrack, mode: WhiteBalanceMode) {
  // advanced 제약은 기기가 못 받으면 조용히 건너뛰므로 getSettings로 다시 확인한다
  await camera.applyConstraints({ advanced: [{ whiteBalanceMode: mode } as MediaTrackConstraintSet] });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 화면 가운데를 작게 그려 흰 종이로 잰다 */
function sampleCenter(video: HTMLVideoElement) {
  const size = 96;
  const ctx = createOffscreen(size, size, true);
  const sw = video.videoWidth * LOCK_SAMPLE_RATIO;
  const sh = video.videoHeight * LOCK_SAMPLE_RATIO;
  ctx.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, 0, 0, size, size);
  return checkWhitePatch(ctx.getImageData(0, 0, size, size).data);
}

const ERRORS = {
  unsupported: "이 기기·브라우저는 카메라 색 고정을 지원하지 않아요. 이가 보이게 웃으면 치아로 보정해요",
  dark: "흰 종이가 화면 가운데를 가득 채우게 비춰 주세요",
  clipped: "종이가 너무 밝아요. 조명에서 조금 떨어져 비춰 주세요",
  colored: "흰 종이가 아닌 것 같아요. 흰 종이를 화면 가득 비춰 주세요",
} as const;

/**
 * 실시간 카메라에서 흰 종이를 비춘 채 화이트밸런스를 고정한다. 그다음 얼굴을 비추면 카메라가 피부를 표준 피부색 쪽으로 끌어당기지 못한다.
 * 고정한 순간의 종이 색을 기준으로 피부색을 되돌린다(아이폰 사파리 17.4+, 안드로이드 크롬)
 */
export function useWhiteBalanceLock(videoRef: RefObject<HTMLVideoElement | null>, videoTrack: () => MediaStreamTrack | null, active: boolean) {
  const lockedWhite = useAnalysisStore((s) => s.lockedWhite);
  const setLockedWhite = useAnalysisStore((s) => s.setLockedWhite);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 카메라가 켜지면(active) 다시 그려지므로 그때 트랙의 지원 여부를 읽는다
  const current = active ? videoTrack() : null;
  const supported = Boolean(current && capabilities(current).whiteBalanceMode?.includes("manual"));

  const lock = useCallback(async () => {
    const camera = videoTrack();
    const video = videoRef.current;
    if (!camera || !video) return;
    setBusy(true);
    setError(null);
    try {
      await setMode(camera, "manual");
      await sleep(LOCK_SETTLE_MS);
      if ((camera.getSettings() as WhiteBalanceSettings).whiteBalanceMode !== "manual") {
        setError(ERRORS.unsupported);
        return;
      }
      const check = sampleCenter(video);
      if ("error" in check) {
        await setMode(camera, "continuous");
        setError(ERRORS[check.error]);
        return;
      }
      setLockedWhite(check.white);
      track({ name: "wb-lock" });
    } catch {
      setError(ERRORS.unsupported);
    } finally {
      setBusy(false);
    }
  }, [videoRef, videoTrack, setLockedWhite]);

  const unlock = useCallback(async () => {
    setLockedWhite(null);
    const camera = videoTrack();
    if (camera) await setMode(camera, "continuous").catch(() => undefined);
  }, [videoTrack, setLockedWhite]);

  return { supported, locked: Boolean(lockedWhite), busy, error, lock, unlock };
}
