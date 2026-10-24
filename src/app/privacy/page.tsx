import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "개인정보처리방침" };

const UPDATED = "2026-10-22";
const ISSUES_URL = "https://github.com/OHaEuN/tonebit/issues";

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-4 pb-16 pt-6 text-[15px] leading-relaxed">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">개인정보처리방침</h1>
          <p className="text-muted">
            톤빛은 이용자의 개인정보를 수집하지 않습니다. 이 문서는 그 설계와,
            이용자가 직접 보내는 선택 항목, 외부 서비스로 이어지는 지점을
            설명합니다.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">1. 얼굴 이미지와 분석 결과</h2>
          <p>
            카메라 영상과 업로드한 사진은 이용자의 브라우저 안에서만 처리되며
            서버로 전송되지 않습니다. 피부톤 분석과 가상 체험은 전부 기기에서
            실행되고, 사이트는 외부 도메인으로의 연결을 브라우저 보안
            정책(CSP)으로 차단합니다. 분석 결과(시즌 톤)도 아래 2번에서 이용자가
            직접 보내지 않는 한 저장하지 않으며, 공유 URL에는 시즌 이름만
            포함됩니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">2. 진단 결과 보내기 (선택)</h2>
          <p>
            결과 화면의 &ldquo;전문가에게 퍼스널 컬러 진단을 받아
            봤나요?&rdquo;에서 이용자가 동의하고 보내기를 누른 경우에만, 다음
            값을 익명으로 저장합니다: 이용자가 고른 진단 시즌·세부 타입, 톤빛의
            판정, 판정에 쓴 측정 숫자(피부색의 Lab 값, 색상각, 밝기 지표), 합친
            사진 수, 카메라·사진 구분, 조명 보정에 쓴 기준, 그때 쓴 판정 기준
            버전, 보낸 날짜.
          </p>
          <p>
            사진, 얼굴 이미지, 기기 정보, 계정이나 연락처처럼 사람을 알아볼 수
            있는 값은 보내지 않습니다. 모은 값은 판정 기준을 전문가 진단에 맞게
            다듬는 데에만 쓰고, 데이터베이스(Supabase Postgres)에 보관합니다.
            시즌별 일치 건수는 정확도 페이지에 집계로만 공개합니다.
          </p>
          <p>
            결과 화면의 &ldquo;이 결과, 내 생각과 비슷해요?&rdquo;와 AI 상담 답의
            &ldquo;도움이 됐어요 / 아쉬워요&rdquo;를 누르면, 누른 답과 톤빛의
            판정·조명 보정 기준(또는 답에 붙은 제품 이름)만 익명으로 저장합니다.
            질문과 답의 글, 사진은 저장하지 않습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">3. AI 뷰티 상담 (선택)</h2>
          <p>
            결과 화면에서 질문을 보내면, 이용자가 입력한 질문과 판정
            결과(시즌·세부 타입)와 측정 숫자(색상각, 밝기 지표, 채도)가 서버를
            거쳐 답변 생성을 위해 Google Gemini API로 전달됩니다. 사진과 얼굴
            이미지는 보내지 않습니다. 무료 이용 등급에서는 전달된 내용이
            Google의 서비스 개선에 쓰일 수 있으니 개인정보를 질문에 적지 말아
            주세요.
          </p>
          <p>
            톤빛은 질문 내용을 저장하지 않습니다. 무료 사용 한도를 지키기 위해
            하루 전체 호출 횟수만 날짜별로 셉니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">4. 쿠키와 저장소</h2>
          <p>
            톤빛은 쿠키, 로컬 저장소, 계정 어느 것으로도 이용자를 식별하거나
            기억하지 않습니다. 광고 스크립트도 싣지 않습니다.
          </p>
          <p>
            서비스 개선을 위해 쿠키 없는 방문 통계 도구(Umami)로 어떤 페이지를
            봤는지, 테스트의 어느 단계까지 진행했는지 같은 흐름만 집계합니다.
            여기에는 얼굴 이미지, 측정 수치, 개인을 특정할 수 있는 정보가
            포함되지 않으며, 브라우저의 추적 방지 설정(Do Not Track)을
            존중합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            5. 제휴 링크 (쿠팡 파트너스)
          </h2>
          <p>
            결과 페이지의 제품 링크는 쿠팡 파트너스 제휴 링크입니다. 링크를 통해
            구매가 이루어지면 운영자가 일정액의 수수료를 받습니다. 링크를 클릭해
            쿠팡으로 이동한 뒤부터는 쿠팡의 서비스 약관과 개인정보처리방침이
            적용됩니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">6. 호스팅과 접속 기록</h2>
          <p>
            사이트는 호스팅 제공자의 서버에서 제공되며, 제공자는 서비스 운영을
            위해 IP 주소와 접속 시각 같은 로그를 일시적으로 보관할 수 있습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">7. 문의</h2>
          <p>
            개인을 알아볼 수 있는 정보를 수집하지 않아 별도의 연락처를 두지
            않았습니다. 질문이나 요청은{" "}
            <a
              href={ISSUES_URL}
              target="_blank"
              rel="noopener"
              className="text-accent underline"
            >
              GitHub 저장소 이슈
            </a>
            로 남겨 주세요.
          </p>
          <p className="text-muted">시행일 {UPDATED}</p>
        </section>

        <Link href="/" className="inline-block text-accent hover:underline">
          ← 톤빛 홈
        </Link>
      </main>
    </>
  );
}
