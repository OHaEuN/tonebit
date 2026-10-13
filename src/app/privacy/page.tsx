import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "개인정보처리방침" };

/** 운영자 연락처. 배포 전에 실제 주소로 바꾼다 */
const CONTACT = "(운영자 이메일)";
const UPDATED = "2026-10-13";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 space-y-8 px-4 py-10 text-sm leading-relaxed">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">개인정보처리방침</h1>
        <p className="text-muted">톤픽은 이용자의 얼굴 이미지를 수집하지 않습니다. 이 문서는 그 밖에 무엇이 어떻게 처리되는지 설명합니다.</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">1. 얼굴 이미지와 분석 결과</h2>
        <p>
          카메라 영상과 업로드한 사진은 이용자의 브라우저 안에서만 처리되며 서버로 전송되지 않습니다. 피부톤 분석과 립 가상 체험은 전부
          기기에서 실행되고, 사이트는 외부 도메인으로의 연결을 브라우저 보안 정책(CSP)으로 차단합니다. 분석 결과(시즌 톤)도 저장하지
          않으며, 공유 URL에는 시즌 이름만 포함됩니다.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">2. 광고 (카카오 AdFit)</h2>
        <p>
          결과 페이지에는 카카오 AdFit 광고가 표시될 수 있습니다. 광고 제공 과정에서 카카오가 쿠키, 광고 식별자, 기기·브라우저 정보를
          수집할 수 있으며 이는 카카오의 개인정보처리방침을 따릅니다. 광고 스크립트는 결과 페이지에서만 불러오고, 카메라를 쓰는 체험
          페이지에서는 불러오지 않습니다.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">3. 제휴 링크 (쿠팡 파트너스)</h2>
        <p>
          결과 페이지의 제품 링크 일부는 쿠팡 파트너스 제휴 링크입니다. 링크를 통해 구매가 이루어지면 운영자가 일정액의 수수료를
          받습니다. 링크를 클릭하면 쿠팡의 서비스 약관과 개인정보처리방침이 적용됩니다.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">4. 호스팅과 접속 기록</h2>
        <p>사이트는 호스팅 제공자의 서버에서 제공되며, 제공자는 서비스 운영을 위해 IP 주소와 접속 시각 같은 로그를 일시적으로 보관할 수 있습니다.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">5. 문의</h2>
        <p>개인정보 관련 문의: {CONTACT}</p>
        <p className="text-muted">시행일 {UPDATED}</p>
      </section>

      <Link href="/" className="inline-block text-accent hover:underline">
        ← 톤픽 홈
      </Link>
    </main>
  );
}
