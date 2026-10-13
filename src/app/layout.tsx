import type { Metadata } from "next";
import { Gowun_Batang } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { Analytics } from "@/features/analytics/Analytics";
// 본문: Pretendard(OFL-1.1). 글자 범위별로 쪼갠 파일이라 화면에 쓰인 글자 묶음만 내려받는다
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

/** 제목용 포인트 서체: 고운바탕(OFL-1.1). 부드러운 붓맛 명조라 화장품 톤과 어울린다 */
// 한글은 글자 범위별로 100여 개 파일로 쪼개져 있어서, 미리 다 받지 않고(preload: false) 화면에 쓰인 범위만 받게 한다
const serif = Gowun_Batang({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-serif-kr", display: "swap", preload: false });

/** next.config.ts에서 정한 사이트 주소. 로컬 개발에선 비어 있다 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_ORIGIN || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "톤픽 · 퍼스널 컬러 & 립 가상 체험", template: "%s | 톤픽" },
  description: "톤픽은 웹캠이나 셀카로 재미로 보는 퍼스널 컬러 테스트예요. 어울리는 립과 블러셔를 얼굴에 바로 발라볼 수 있어요. 사진은 기기 밖으로 나가지 않아요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`h-full ${serif.variable}`}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
