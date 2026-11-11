interface AffiliateNoteProps {
  /** 같은 문단 앞에 붙는 한 문장(예: 인기 순위의 기준 시점) */
  lead?: string;
}

/** 구매 링크가 있는 화면마다 두는 쿠팡 파트너스 고지 */
export function AffiliateNote({ lead }: AffiliateNoteProps) {
  return (
    <p className="mt-4 text-xs leading-relaxed text-muted">
      {lead && `${lead} `}제품 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
    </p>
  );
}
