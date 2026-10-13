# 톤픽 (TonePick)

내 톤을 찾고 립을 픽한다. 웹캠이나 셀카 한 장으로 웜·쿨 톤과 시즌을 "재미로" 가늠하고, 추천 립·블러셔를 얼굴에 실시간으로 얹어 보는 웹 서비스입니다.
얼굴 이미지는 어떤 경우에도 서버로 가지 않습니다. 분석·렌더링 전부가 브라우저 안에서 끝납니다.

- 스택: Next.js 16 (App Router, Cache Components) · React 19 · TypeScript strict · Tailwind v4 · Zustand · MediaPipe Tasks Vision (Face Landmarker)
- 테스트: Vitest (색 분석 순수 함수) · Playwright (가짜 카메라 + 고정 셀카 fixture)
- CI: GitHub Actions (lint → typecheck → unit → e2e)

## 프라이버시 설계

"서버로 안 보낸다"를 말로만 하지 않고 브라우저가 강제하게 했습니다.

| 장치 | 내용 |
|---|---|
| 온디바이스 추론 | MediaPipe Face Landmarker가 wasm + WebGL로 브라우저에서 돌아갑니다. 프레임은 `<canvas>` 밖으로 나가지 않습니다. |
| 모델·wasm 자체 호스팅 | `public/models/face_landmarker.task`(커밋)와 `public/wasm/`(postinstall로 node_modules에서 복사). CDN을 쓰지 않습니다. |
| CSP `connect-src 'self'` | `next.config.ts`에서 모든 응답에 붙습니다. 외부 도메인으로의 fetch/XHR/WebSocket이 브라우저 레벨에서 차단됩니다. 실제로 tasks-vision이 `odml.pa.googleapis.com/v1/log`로 보내려는 텔레메트리가 이 정책에 막히는 걸 E2E 콘솔에서 확인할 수 있습니다. |
| 공유 URL | `/r/{season}` 뿐입니다. 측정값, 이미지, 식별자 어떤 것도 싣지 않습니다. |
| 공유 카드 | `next/og`로 서버에서 그리는 OG 이미지는 시즌 이름과 팔레트만 담습니다. 얼굴이 들어갈 입력 자체가 없습니다. |

광고 스크립트를 붙일 때는 `/r` 라우트에만 광고 도메인을 허용하고 `/try`는 그대로 둡니다. 헤더는 라우트별로 나눌 수 있게 `headers()`에 모아 두었습니다.

## 아키텍처

```
src/
  app/
    page.tsx                        랜딩. 서버 컴포넌트, 클라이언트 JS 거의 없음
    try/page.tsx                    카메라·업로드 → 조명 체크 → 측정 → 립 체험 (한 화면)
    r/[season]/page.tsx             결과 페이지. 네 시즌 정적 생성
    r/[season]/opengraph-image.tsx  공유 카드. 한글 서브셋 폰트 동봉, 정적 생성
  features/
    camera/      useCameraStream (getUserMedia, 권한 분기, iOS)
    landmark/    useFaceLandmarker (tasks-vision lazy import), indices, geometry
    analysis/    color · sample · lighting · tone · constants  ← 순수 함수, Vitest 대상
                 frame.ts  ← 캔버스에서 픽셀을 읽어 순수 함수에 넘기는 유일한 DOM 어댑터
    lipTryOn/    render.ts (마스크·페더링·블렌딩), ColorPicker
    try/         useTryOnLoop (rAF 루프), useStillAnalysis (업로드), TrySession 및 하위 UI
    recommend/   palettes, products.json, getProducts (데이터 교체 지점), ProductCard
    share/       resultUrl, ShareButtons (Web Share API, 복사 fallback)
    ads/         AdSlot (320×100 고정, CLS 0)
  stores/analysisStore.ts           Zustand. 단계·조명·결과·선택 색
  types/                            도메인 타입
```

프레임 흐름 (카메라):

```
video frame ─ detectForVideo ─▶ 478 landmarks
   ├─ live 단계      10프레임마다 조명 체크 (얼굴 패치 휘도, gray-world 색편향, 얼굴 크기)
   ├─ measuring 단계 볼×2·이마 패치 → 대표 Lab → 20프레임 median → 시즌 판정
   └─ 매 프레임      입술 마스크 + 블러셔 → 캔버스 합성
```

업로드 경로는 같은 함수를 한 번만 호출하고, 색을 고를 때마다 정지 화면을 다시 그립니다.

tasks-vision(약 10MB)은 `/try`의 훅이 마운트될 때 `import()`로 처음 내려받습니다. 랜딩 페이지 번들에는 들어가지 않습니다. 모델·wasm은 `Cache-Control: immutable`이라 재방문은 즉시 뜹니다.

## 색 분석 알고리즘

전부 `features/analysis/`의 순수 함수이고 임계값은 `constants.ts` 한 곳에 있습니다.

**샘플링.** 랜드마크 50·280(양 볼 사과 부위)과 151(이마 중앙)을 중심으로 정사각 패치를 읽습니다. 한 변은 눈 바깥꼬리(33↔263) 거리의 25%라 얼굴 크기와 무관하게 같은 비율이 잡힙니다. 폴리곤 대신 사각형을 쓴 이유는 순서 문제가 없고, 가장자리 오염은 다음 단계가 걸러내기 때문입니다.

**이상치 제거.**
1. 픽셀 사전 제거: 어느 채널이든 250 이상이면 스펙큘러 하이라이트, 인코딩 휘도 40 미만이면 그림자·머리카락·눈썹으로 보고 버립니다.
2. Lab 변환 후 채널별 median ± 3×MAD 밖을 버립니다. 표준편차는 이상치 자체에 끌려가지만 MAD는 끌려가지 않아서, 안경테나 머리카락이 패치에 걸려도 버팁니다. 3×MAD는 정규분포 기준 약 2σ입니다.
3. 남은 픽셀의 median → 패치, 세 패치의 median → 프레임, 20프레임의 median → 최종. mean 대신 median을 쓰는 이유는 잔여 이상치와 프레임 노이즈에 강하기 때문입니다.

**색공간.** sRGB → 감마 해제 → XYZ(D65) → CIELAB. 피부색 문헌이 전부 Lab 기준이고 L/a/b가 명도·붉은기·노란기로 분리됩니다.

**지표.**
- ITA° = atan((L* − 50) / b*) × 180/π. Chardon(1991)의 피부 밝기 지표. Del Bino(2013) 경계: very light > 55, light 41~55, intermediate 28~41, tan 10~28, brown −30~10, dark < −30.
- hue h° = atan2(b*, a*). 노란기 대 붉은기. 클수록 골드(웜), 작을수록 핑크(쿨).
- chroma C* = √(a*² + b*²). 선명 vs 뮤트.

**판정.**

| 축 | 지표 | 초기값 | 근거 |
|---|---|---|---|
| 웜/쿨 | h° | ≥ 57 웜, ≤ 53 쿨, 사이 뉴트럴 | 한국인 얼굴 피부 평균 a* ≈ 10, b* ≈ 16 → h ≈ 57°. 웜/쿨은 절대 기준이 없는 상대 개념이라 모집단 중앙값 ±2°에서 시작. 카메라 화이트밸런스가 ±5° 흔들어서 뉴트럴 구간이 필수 |
| 명/암 | ITA | ≥ 41 light, 미만 deep | Del Bino light/intermediate 경계. 한국인 평균(L* 64, b* 16)의 ITA가 약 40이라 모집단을 반으로 가름 |
| 선명/뮤트 | C* | ≥ 20 clear, 미만 muted | 피부 C* 16~24의 중앙 |

시즌 = 웜/쿨 × 명/암 (웜·light 봄, 웜·deep 가을, 쿨·light 여름, 쿨·deep 겨울). 뉴트럴이면 채도로 가릅니다 (light·clear 봄, light·muted 여름, deep·muted 가을, deep·clear 겨울). 확신도는 각 축에서 임계값까지의 거리로 높음·보통·낮음만 보여 주고 숫자는 노출하지 않습니다. 뉴트럴은 항상 "낮음"입니다.

**조명 체크.** 측정 전 실시간 배지. 얼굴 패치 평균 휘도 70 미만이면 어두움, 200 초과 또는 클리핑 5% 초과면 과노출. 프레임을 64×48로 줄여 gray-world(장면 평균은 회색에 가깝다)로 R/G·B/G가 0.8~1.25를 벗어나면 색편향. 얼굴 bbox 폭이 프레임의 25% 미만이면 가까이 오라고 합니다.

**한계.** L*는 노출에, h°는 화이트밸런스에 종속됩니다. 기준 흰색 없이는 절대값을 못 구하고, ITA 경계가 모집단 중앙에 있어 노출이 조금만 바뀌어도 light/deep이 뒤집힐 수 있습니다. 그래서 "재미로"이고 UI에 그대로 적어 두었습니다. 올리브톤(a* 낮음)은 h°가 커져 웜으로 쏠리는 경향도 있습니다.

## 립 가상 체험

- 마스크: 입술 바깥 링 20점 + 안쪽 링 20점을 `evenodd`로 채워 입을 벌려도 치아가 빠집니다.
- 페더링: 오프스크린 캔버스에 `filter: blur()`. 반경은 눈 거리의 1.5%라 얼굴 크기에 비례합니다. `ctx.filter` 미지원 브라우저는 shadowBlur 트릭으로 fallback.
- 블렌딩 프리셋 (`BLEND_PRESETS`, 고급 패널에서 전환 가능):
  - `natural` (기본): `color` 0.75 + `multiply` 0.3. `color`는 소스의 색상·채도만 가져오고 명도는 배경 것이라 입술 주름과 음영이 남고, `multiply` 한 겹이 깊이를 줍니다.
  - `multiply` 0.7: 틴트처럼 은은하지만 파스텔이 탁해집니다.
  - `soft-light`: 어두운 입술엔 거의 안 묻습니다.
- 성능: 입력 해상도 720px 상한, 프레임이 밀리면 큐에 쌓지 않고 건너뜀. 고급 패널에 FPS 표시. Web Worker/OffscreenCanvas는 실측 후 30fps 미달일 때 넣기로 하고 넣지 않았습니다.

## 개발

```bash
pnpm install          # postinstall이 tasks-vision wasm을 public/wasm으로 복사
pnpm dev              # http://localhost:3000  (카메라는 localhost 또는 HTTPS에서만)
pnpm dev --experimental-https   # 폰에서 테스트할 때
pnpm lint && pnpm typecheck && pnpm test
pnpm e2e              # Playwright. 가짜 카메라 플래그 + e2e/fixtures/face.jpg
pnpm build
```

Next 16은 디렉토리당 dev 서버를 하나만 허용합니다. E2E는 3100 포트에 자체 dev 서버를 띄우므로 다른 dev 서버가 떠 있으면 먼저 내려야 합니다.

OG 카드 문구를 바꿨으면 한글 서브셋 폰트를 다시 만듭니다 (카드에 쓰는 글자만 담아 약 35KB).

```bash
node -e '
const fs=require("fs");
const text=fs.readFileSync("src/features/recommend/palettes.ts","utf8")+fs.readFileSync("src/app/r/[season]/opengraph-image.tsx","utf8");
const chars=[...new Set([...text].filter(c=>/[가-힣A-Za-z0-9·,.!?%&()\-\s]/.test(c)))].join("");
(async()=>{const css=await(await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(chars)}`)).text();
const url=css.match(/src: url\((.+?)\) format\(\x27(?:opentype|truetype)\x27\)/)[1];
fs.writeFileSync("src/app/r/[season]/NotoSansKR-700-subset.ttf",Buffer.from(await(await fetch(url)).arrayBuffer()));})()'
```

E2E fixture `e2e/fixtures/face.jpg`는 MediaPipe 공식 예제 이미지(미국 정부 공개 초상, 퍼블릭 도메인)입니다.

## 배포

Vercel 기준으로 맞춰져 있습니다. `headers()`, `next/og`, 정적 생성이 추가 설정 없이 동작하고, HTTPS가 기본이라 카메라 권한도 바로 됩니다. `metadataBase`는 `VERCEL_PROJECT_PRODUCTION_URL`을 자동으로 쓰고, 다른 호스팅이면 `NEXT_PUBLIC_SITE_URL`을 줍니다.

Vercel Hobby 플랜은 비상업 용도 조건이 있어서, 광고·제휴 수익이 실제로 붙는 시점에는 Pro 또는 Cloudflare(OpenNext)로 옮깁니다. 코드에 플랫폼 종속은 없습니다.

## 수익화 연결

**카카오 AdFit (결과 페이지 320×100 배너)**
1. adfit.kakao.com에서 매체(웹사이트, 배포된 도메인) 등록 → 광고단위 생성(320×100) → `DAN-…` ID 발급.
2. Vercel 환경변수 `NEXT_PUBLIC_ADFIT_UNIT_RESULT`에 그 ID를 넣고 재배포. 이 변수가 비어 있으면 placeholder가 보인다.
3. AdFit은 스크립트가 실제로 광고 요청을 보내는 것을 확인한 뒤 심사한다(영업일 1~2일). 승인 전까지는 빈 영역으로 보인다.
4. 광고 스크립트는 `AdSlot`이 마운트될 때 `<ins class="kakao_ad_area">`와 `ba.min.js`를 넣는 방식이라 결과 페이지에서만 로드되고, `/r/:path*` 전용 CSP(`next.config.ts`)가 카카오 도메인만 허용한다. 체험 페이지는 외부 연결이 전부 막힌 그대로다.

**쿠팡 파트너스 (제품 카드 링크)**
1. partners.coupang.com에서 가입하고 활동 채널에 배포된 도메인을 등록한다.
2. 파트너스 콘솔에서 제품별 링크를 만들어 `features/recommend/products.json`의 `url`에 넣는다. 카드의 `rel="sponsored"`와 결과 페이지의 수수료 고지 문구는 이미 들어 있다.
3. 최종 승인(누적 판매 금액 기준, 콘솔 공지에서 확인)이 나야 정산과 Open API(상품 검색·딥링크)를 쓸 수 있다. API를 쓰게 되면 `getProducts`만 fetch로 바꾼다.

개인정보처리방침은 `/privacy`에 있고 푸터에서 링크된다. 배포 전에 `src/app/privacy/page.tsx`의 연락처를 채운다.

## 데이터 교체

제품은 `features/recommend/products.json` 목업이고 `getProducts(season)` 하나로만 읽습니다. 쇼핑몰 API로 바꿀 때 이 함수만 fetch로 교체하면 됩니다. 쇼핑몰 크롤링은 하지 않습니다. 제휴 링크는 `url` 필드의 placeholder를 바꿉니다.

## 다음 단계

- 12시즌 세분화 (chroma·ITA 2차 분할)
- 실측 FPS가 모바일에서 30 미만이면 랜드마커를 Web Worker로
- 실제 광고 스크립트 연결 시 `/r` 라우트 CSP 완화
- `features/analysis/constants.ts` 임계값을 실제 사용자 샘플로 튜닝
