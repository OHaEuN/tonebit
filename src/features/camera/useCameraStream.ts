"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export type CameraStatus = "idle" | "requesting" | "active" | "denied" | "unavailable" | "unsupported";

export function useCameraStream(videoRef: RefObject<HTMLVideoElement | null>) {
  const [status, setStatus] = useState<CameraStatus>("idle");
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus((s) => (s === "active" || s === "requesting" ? "idle" : s));
  }, [videoRef]);

  /** iOS Safari는 사용자 제스처 안에서만 허용하므로 버튼 핸들러에서 직접 호출한다 */
  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("video element missing");
      video.srcObject = stream;
      await video.play();
      setStatus("active");
    } catch (e) {
      stop();
      const name = e instanceof DOMException ? e.name : "";
      setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
    }
  }, [videoRef, stop]);

  useEffect(() => stop, [stop]);

  /** 지금 켜진 영상 트랙. 화이트밸런스 고정에 쓴다 */
  const videoTrack = useCallback(() => streamRef.current?.getVideoTracks()[0] ?? null, []);

  return { status, start, stop, videoTrack };
}
