import Script from "next/script";

/** Umami Website ID. 페이지 HTML에 그대로 노출되는 공개값이라 코드에 둔다. 환경변수가 있으면 그쪽이 우선 */
const WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ?? "4a7ea80e-0341-498b-8ccd-44e1100fb43a";
/** 이 도메인에서만 수집한다. 로컬 개발과 E2E는 제외 */
const DOMAINS = process.env.NEXT_PUBLIC_UMAMI_DOMAINS ?? "tonepick-three.vercel.app";

/** 같은 오리진(/stats)으로 프록시해서 CSP connect-src 'self'를 유지한다. next.config.ts의 rewrites 참고 */
export function Analytics() {
  return (
    <Script
      src="/stats/script.js"
      data-website-id={WEBSITE_ID}
      data-host-url="/stats"
      data-domains={DOMAINS}
      strategy="afterInteractive"
    />
  );
}
