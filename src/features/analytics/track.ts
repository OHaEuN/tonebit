/**
 * 사용 흐름 이벤트. Umami(쿠키 없음, 개인 식별 없음)가 붙어 있으면 보내고 아니면 아무것도 안 한다.
 * 이벤트에는 얼굴·측정 수치를 절대 싣지 않는다. 톤 이름과 단계 이름만.
 */
export type AnalyticsEvent =
  | { name: "try-start"; source: "camera" | "image" }
  | { name: "camera-denied" }
  | { name: "model-error" }
  | { name: "face-not-found"; source: "camera" | "image" }
  | { name: "measure-done"; tone: string; confidence: string; source: "camera" | "image" }
  | { name: "swatch-select"; kind: "lip" | "blush"; product: boolean }
  | { name: "wb-lock" }
  | { name: "drape-done"; season: string; same: boolean }
  | { name: "shade-saved"; kind: "lip" | "blush" }
  | { name: "advisor-ask" }
  | { name: "advisor-try-on" }
  | { name: "expert-preset"; season: string }
  | { name: "expert-sent"; via: "compare" | "form"; same: boolean };

interface Umami {
  track: (name: string, data?: Record<string, string | number | boolean>) => void;
}

export function track(event: AnalyticsEvent) {
  const umami = (window as unknown as { umami?: Umami }).umami;
  if (!umami) return;
  const { name, ...data } = event;
  umami.track(name, data);
}
