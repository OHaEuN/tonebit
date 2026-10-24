import type { Metadata } from "next";
import { DM_Mono } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { Analytics } from "@/features/analytics/Analytics";
// 본문: Pretendard(OFL-1.1). 글자 범위별로 쪼갠 파일이라 화면에 쓰인 글자 묶음만 내려받는다
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

/** 버튼·메뉴·태그의 영문 라벨용 고정폭 서체(DM Mono, OFL-1.1). 한글은 Pretendard로 이어진다 */
const mono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-mono-latin", display: "swap" });

/** next.config.ts에서 정한 사이트 주소. 로컬 개발에선 비어 있다 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_ORIGIN || "http://localhost:3000";

/** 검색엔진 소유 확인 코드. 서치어드바이저(네이버)·서치콘솔(구글)에서 받아 환경변수로 넣는다. 없으면 태그도 안 나간다 */
const naverVerification = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION;
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "톤빛 · 퍼스널 컬러 & 립 가상 체험", template: "%s | 톤빛" },
  description: "톤빛은 웹캠이나 셀카로 재미로 보는 퍼스널 컬러 테스트예요. 어울리는 립과 블러셔를 얼굴에 바로 발라볼 수 있어요. 사진은 기기 밖으로 나가지 않아요.",
  verification: {
    google: googleVerification,
    other: naverVerification ? { "naver-site-verification": naverVerification } : undefined,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`h-full ${mono.variable}`}>
      <body className="flex min-h-full flex-col font-sans">
        <p className="bg-announce px-4 py-2 text-center font-mono text-[11px] font-medium uppercase tracking-[0.06em]">
          <span className="hidden md:inline">Photos never leave your device · </span>
          <span className="font-sans tracking-normal">사진은 기기 밖으로 나가지 않아요</span>
        </p>
        {children}
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
