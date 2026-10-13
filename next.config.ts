import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * 얼굴 데이터가 기기 밖으로 못 나가게 브라우저 레벨에서 막는다.
 * connect-src 'self' 때문에 외부 도메인으로의 fetch/XHR/WebSocket 자체가 차단된다.
 */
const strictCsp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "worker-src 'self' blob:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

/**
 * 결과 페이지(/r)만 카카오 AdFit을 허용한다. 얼굴 데이터가 있는 /try는 strictCsp 그대로.
 * ponytail: 광고 소재 이미지는 출처가 제각각이라 img-src https:로 열어 뒀다. 광고가 빈 채로 나오면 콘솔의 CSP 오류를 보고 도메인을 넓힌다
 */
const AD_HOSTS = "https://*.daum.net https://*.daumcdn.net https://*.kakao.com https://*.kakaocdn.net";
const adsCsp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${AD_HOSTS}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "media-src 'self' blob:",
  `connect-src 'self' ${AD_HOSTS}${isDev ? " ws: wss:" : ""}`,
  `frame-src ${AD_HOSTS}`,
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: strictCsp },
          { key: "Permissions-Policy", value: "camera=(self)" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        // 뒤에 오는 항목이 같은 키를 덮어쓴다
        source: "/r/:path*",
        headers: [{ key: "Content-Security-Policy", value: adsCsp }],
      },
      {
        source: "/(wasm|models)/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
