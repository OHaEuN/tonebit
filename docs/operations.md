# 운영: 개발, 배포, 분석, 수익화

[← README](../README.md)

## 개발

```bash
pnpm install          # postinstall이 tasks-vision wasm을 public/wasm/<버전>으로 복사
pnpm dev              # http://localhost:3000  (카메라는 localhost 또는 HTTPS에서만)
pnpm dev --experimental-https   # 폰에서 테스트할 때
pnpm lint && pnpm typecheck && pnpm test
pnpm e2e              # Playwright. 가짜 카메라 플래그 + e2e/fixtures/face.jpg
pnpm build
```

DB·AI까지 로컬에서 돌리려면 Docker로 Postgres(pgvector)를 띄웁니다. Gemini 키가 없으면 가짜 서버로 대신합니다.

```bash
docker compose up -d db
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/tonebit
pnpm db:migrate && pnpm db:seed           # 스키마 + 제품·가이드 적재(GEMINI_API_KEY가 있으면 임베딩)
node e2e/mock-gemini.mjs &                # 키 없이: 가짜 Gemini
export GEMINI_API_KEY=test GEMINI_BASE_URL=http://localhost:3999/v1beta
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/tonebit_test pnpm test   # DB 통합 테스트 포함
INTEGRATION=1 pnpm e2e e2e/integration.spec.ts
pnpm calibrate --dry-run                  # 재보정 결과만 보기

docker compose up --build                 # 앱까지 컨테이너로 (http://localhost:3000)
```

Next 16은 디렉토리당 dev 서버를 하나만 허용합니다. E2E는 3100 포트에 자체 dev 서버를 띄우므로 다른 dev 서버가 떠 있으면 먼저 내려야 합니다.

OG 카드나 톤 설명 문구를 바꿨으면 한글 서브셋 폰트를 다시 만듭니다 (카드에 쓰는 글자만 담아 약 60KB).

```bash
node -e '
const fs=require("fs");
const text=["src/features/recommend/palettes.ts","src/app/r/[tone]/opengraph-image.tsx","src/app/opengraph-image.tsx"].map(f=>fs.readFileSync(f,"utf8")).join("");
const chars=[...new Set([...text].filter(c=>/[가-힣A-Za-z0-9·,.!?%&()\-\s:]/.test(c)))].join("");
(async()=>{const css=await(await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(chars)}`)).text();
const url=css.match(/src: url\((.+?)\) format\(\x27(?:opentype|truetype)\x27\)/)[1];
fs.writeFileSync("src/app/NotoSansKR-700-subset.ttf",Buffer.from(await(await fetch(url)).arrayBuffer()));})()'
```

E2E fixture `e2e/fixtures/face.jpg`는 MediaPipe 공식 예제 이미지(미국 정부 공개 초상, 퍼블릭 도메인)입니다. `face-paper*.jpg`는 여기에 흰 종이를 그려 넣고, `-fluorescent`는 형광등처럼 선형 RGB에 (0.9, 1.12, 0.98) 게인을 곱한 것입니다.

## 배포

Vercel 기준으로 맞춰져 있습니다. `headers()`, `next/og`, 정적 생성이 추가 설정 없이 동작하고, HTTPS가 기본이라 카메라 권한도 바로 됩니다. `metadataBase`는 `VERCEL_PROJECT_PRODUCTION_URL`을 자동으로 쓰고, 다른 호스팅이면 `NEXT_PUBLIC_SITE_URL`을 줍니다.

Vercel Hobby 플랜은 비상업 용도 조건이 있어서, 광고·제휴 수익이 실제로 붙는 시점에는 Pro 또는 Cloudflare(OpenNext)로 옮깁니다. 코드에 플랫폼 종속은 없습니다.

### DB·AI 켜기 (무료)

전부 무료 등급으로 돕니다. 값이 없으면 해당 기능만 꺼지고 나머지는 그대로 동작합니다.

1. **Supabase** 프로젝트를 만들고(무료) Project Settings → Database → Connection string에서 **Transaction pooler** 주소(6543 포트)를 복사합니다. 서버리스 함수와 GitHub Actions(IPv4)에서 붙을 수 있는 주소입니다. 무료 프로젝트는 일주일 동안 요청이 없으면 일시정지되니, 주간 재보정 워크플로가 깨워 주는 역할도 합니다.
2. **Google AI Studio**에서 Gemini API 키를 만듭니다(무료 등급). 무료 등급 입력은 Google 서비스 개선에 쓰일 수 있어서, 상담에는 사진 없이 진단 숫자와 질문만 보냅니다.
3. **Vercel** 환경 변수: `DATABASE_URL`, `GEMINI_API_KEY`(선택: `GEMINI_MODEL`=쉼표로 구분한 모델 목록, `ADVISOR_DAILY_CAP`). 화면에 기능을 켤지는 빌드 때 정해지므로 넣은 뒤 다시 배포합니다.
4. **GitHub 저장소 Secrets**: `DATABASE_URL`, `GEMINI_API_KEY`. master에 머지되면 `DB 배포` 워크플로가 마이그레이션과 지식 적재를, 매주 월요일 `판정 기준 재보정` 워크플로가 재보정을 합니다. 처음 한 번은 Actions 탭에서 `DB 배포`를 수동 실행하면 됩니다. PR을 올리면 같은 워크플로가 운영 DB·Gemini 연결, pgvector, 머지하면 적용될 마이그레이션을 읽기만 해서 점검합니다(`pnpm check:env`).

모은 진단을 내려받기: `FEEDBACK_ADMIN_TOKEN`을 환경 변수에 넣고 `curl -H "Authorization: Bearer $FEEDBACK_ADMIN_TOKEN" https://<도메인>/api/feedback`.

## 검색엔진 등록

`/sitemap.xml`(홈·체험·12개 톤 페이지·개인정보처리방침)과 `/robots.txt`는 코드로 만들어지고, 주소는 `NEXT_PUBLIC_SITE_ORIGIN`을 따릅니다. 시즌만 있는 옛 링크(`/r/spring`)는 canonical로 트루 타입에 합쳐지므로 사이트맵에 넣지 않습니다.

1. **네이버 서치어드바이저**(searchadvisor.naver.com) → 사이트 등록 → "HTML 태그" 방식의 content 값을 Vercel 환경변수 `NEXT_PUBLIC_NAVER_SITE_VERIFICATION`에 넣고 다시 배포 → 소유 확인 → 요청 > 사이트맵 제출에 `https://<도메인>/sitemap.xml`.
2. **구글 서치콘솔**(search.google.com/search-console) → URL 접두어 → "HTML 태그" 방식의 content 값을 `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`에 넣고 다시 배포 → 소유 확인 → Sitemaps에 `sitemap.xml` 제출.

환경변수가 없으면 확인 태그는 HTML에 들어가지 않습니다.

## 수익화 연결

**쿠팡 파트너스 (제품 카드 링크)**
- 파트너스 ID는 `features/recommend/affiliate.ts`에 있다. 링크에 노출되는 공개값이다.
- `products.json`의 각 항목은 `keyword`로 쿠팡 검색 결과 제휴 링크(`link.coupang.com/re/AFFSRP?lptag=…&subid=tonebit&pageKey=검색어`)를 만든다. 검색어는 `q`가 아니라 `pageKey`다. `q`는 쿠팡 홈으로 떨어진다. 특정 상품을 밀고 싶으면 콘솔에서 만든 상품 링크를 `url`에 넣으면 그게 우선한다. 카드의 `rel="sponsored"`와 결과 페이지의 수수료 고지 문구는 들어 있다.
- 최종 승인(누적 판매 금액 기준, 콘솔 공지에서 확인)이 나야 정산과 Open API(상품 검색·딥링크)를 쓸 수 있다. API를 쓰게 되면 `getProducts`만 fetch로 바꾼다.

개인정보처리방침은 `/privacy`에 있고 푸터에서 링크된다. 수집하는 개인정보가 없어 연락처 대신 GitHub 이슈를 안내한다. 광고 네트워크는 붙이지 않았다.

## 데이터 교체

제품은 `features/recommend/products.json` 목업이고 `getProducts(season)` 하나로만 읽습니다. 쇼핑몰 API로 바꿀 때 이 함수만 fetch로 교체하면 됩니다. 쇼핑몰 크롤링은 하지 않습니다. 제휴 링크는 `url` 필드의 placeholder를 바꿉니다.

## 사용 흐름 분석 (Umami)

쿠키 없는 Umami Cloud(무료, 월 10만 이벤트)를 씁니다. 스크립트와 수집 엔드포인트를 `/stats`로 리라이트해서 브라우저는 우리 도메인만 호출하므로 CSP `connect-src 'self'`가 그대로 유지됩니다.

1. Website ID는 `features/analytics/Analytics.tsx`에 기본값으로 들어 있습니다 (HTML에 노출되는 공개값). 바꾸려면 환경변수 `NEXT_PUBLIC_UMAMI_WEBSITE_ID`로 덮어씁니다.
2. `data-domains`로 배포 도메인에서만 수집합니다. 로컬 개발과 E2E는 집계되지 않습니다. 도메인을 바꾸면 `NEXT_PUBLIC_UMAMI_DOMAINS`를 같이 바꿉니다.
3. 이벤트: `try-start`(source), `camera-denied`, `model-error`, `face-not-found`, `measure-done`(tone, confidence, source), `swatch-select`(kind, product), `wb-lock`, `drape-done`(season, same), `shade-saved`(kind), `share`, `card-download`, `product-click`(id). 얼굴·측정 수치는 싣지 않습니다. `features/analytics/track.ts`에 타입으로 고정되어 있습니다.
