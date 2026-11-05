interface PrivacyNoteProps {
  compact?: boolean;
}

export function PrivacyNote({ compact = false }: PrivacyNoteProps) {
  return (
    <aside
      aria-label="개인정보 안내"
      className="flex gap-3 text-sm leading-relaxed"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 size-5 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
      <div>
        <p className="font-semibold">사진은 기기 밖으로 나가지 않아요</p>
        {!compact && (
          <p className="mt-1 text-muted">
            얼굴 인식과 색 분석이 전부 브라우저 안에서 끝나요. 서버로 보내는 사진이 없어요.
          </p>
        )}
      </div>
    </aside>
  );
}
