/** 쿠팡 파트너스 ID. 링크에 그대로 노출되는 공개값이라 환경변수로 숨길 이유가 없다 */
export const COUPANG_PARTNER_ID = "AF7794727";

/** 파트너스 콘솔에서 채널별 실적을 구분하는 서브 ID */
const SUB_ID = "tonepick";

/**
 * 검색 결과로 가는 제휴 링크. 검색어는 q가 아니라 pageKey에 넣어야 검색 페이지로 간다 (q는 홈으로 떨어짐, 2026-10 확인).
 * 특정 상품 링크(콘솔에서 생성)가 있으면 그걸 우선 쓴다
 */
export function coupangSearchUrl(keyword: string): string {
  return `https://link.coupang.com/re/AFFSRP?lptag=${COUPANG_PARTNER_ID}&subid=${SUB_ID}&pageKey=${encodeURIComponent(keyword)}`;
}
