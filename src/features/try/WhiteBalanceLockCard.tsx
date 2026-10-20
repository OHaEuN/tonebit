"use client";

interface WhiteBalanceLockCardProps {
  locked: boolean;
  busy: boolean;
  error: string | null;
  onLock: () => void;
  onUnlock: () => void;
}

const BUTTON =
  "rounded-full px-4 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

/** 측정 전에 흰 종이로 카메라 색을 고정하는 안내. 지원하는 기기에서만 보인다 */
export function WhiteBalanceLockCard({ locked, busy, error, onLock, onUnlock }: WhiteBalanceLockCardProps) {
  return (
    <div className="space-y-2 rounded-2xl border border-line p-4 text-sm">
      <p className="font-medium">{locked ? "흰 종이로 카메라 색을 고정했어요" : "더 정확하게: 흰 종이로 카메라 색 고정"}</p>
      <p className="text-muted">
        {locked
          ? "이제 얼굴을 비추고 측정을 시작하세요. 조명이 다른 곳으로 옮기면 다시 고정해 주세요."
          : "카메라는 얼굴을 보면 피부색을 평균 쪽으로 바꿔 버려요. 흰 종이를 화면 가득 비추고 고정하면 그걸 막고, 그 종이를 기준으로 색을 되돌려요. 창가 햇빛보다 실내 조명 아래가 더 정확해요."}
      </p>
      {error && (
        <p role="alert" className="text-amber-900">
          {error}
        </p>
      )}
      {locked ? (
        <button type="button" onClick={onUnlock} className={`${BUTTON} border border-line bg-card hover:bg-accent-soft`}>
          고정 풀기
        </button>
      ) : (
        <button type="button" onClick={onLock} disabled={busy} className={`${BUTTON} border border-line bg-card hover:bg-accent-soft`}>
          {busy ? "고정하는 중…" : "흰 종이 비추고 색 고정"}
        </button>
      )}
    </div>
  );
}
