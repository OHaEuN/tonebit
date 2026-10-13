import type { Metadata } from "next";
import "./globals.css";

/** Vercel이면 프로덕션 도메인을 자동으로 쓴다. 다른 호스팅은 NEXT_PUBLIC_SITE_URL을 준다 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "퍼스널 컬러 & 립 가상 체험", template: "%s | 퍼스널 컬러 테스트" },
  description: "웹캠이나 셀카로 재미로 보는 퍼스널 컬러 테스트. 어울리는 립 컬러를 바로 발라볼 수 있어요. 사진은 기기 밖으로 나가지 않아요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
