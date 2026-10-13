import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

/** wasm 경로에 넣을 tasks-vision 버전. scripts/copy-wasm.mjs와 같은 값 */
const mediapipeVersion: string = JSON.parse(readFileSync("node_modules/@mediapipe/tasks-vision/package.json", "utf8")).version;

const isDev = process.env.NODE_ENV === "development";

/**
 * 얼굴 데이터가 기기 밖으로 못 나가게 브라우저 레벨에서 막는다.
 * connect-src 'self' 때문에 외부 도메인으로의 fetch/XHR/WebSocket 자체가 차단된다.
 */
const strictCsp = [
  "default-src 'self'",
  // 'unsafe-eval'은 'wasm-unsafe-eval'을 모르거나(구형 iOS) 무시하는 WebKit 버전의 wasm 컴파일 차단을 피하기 위한 보강
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' 'unsafe-eval'",
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

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_MEDIAPIPE_VERSION: mediapipeVersion },
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
  /** Umami 분석 스크립트·수집 엔드포인트를 같은 오리진으로 프록시. 브라우저는 우리 도메인만 본다 */
  async rewrites() {
    return [
      { source: "/stats/script.js", destination: "https://cloud.umami.is/script.js" },
      { source: "/stats/api/send", destination: "https://cloud.umami.is/api/send" },
    ];
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
        source: "/(wasm|models)/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
