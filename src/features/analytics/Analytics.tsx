import Script from "next/script";

/** 같은 오리진(/stats)으로 프록시해서 CSP connect-src 'self'를 유지한다. next.config.ts의 rewrites 참고 */
const WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

export function Analytics() {
  if (!WEBSITE_ID) return null;
  return <Script src="/stats/script.js" data-website-id={WEBSITE_ID} data-host-url="/stats" strategy="afterInteractive" />;
}
