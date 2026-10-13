# 톤픽 (TonePick)

**https://tonepick-three.vercel.app**

내 톤을 찾고 립을 픽한다. 웹캠이나 셀카 한 장으로 웜·쿨 톤과 시즌을 "재미로" 가늠하고, 추천 립·블러셔를 얼굴에 실시간으로 얹어 보는 웹 서비스입니다.
얼굴 이미지는 어떤 경우에도 서버로 가지 않습니다. 분석·렌더링 전부가 브라우저 안에서 끝납니다.

- 스택: Next.js 16 (App Router, Cache Components) · React 19 · TypeScript strict · Tailwind v4 · Zustand · MediaPipe Tasks Vision (Face Landmarker)
- 결과: 웜·쿨과 12시즌 세부 타입, 그렇게 판정한 근거 문장, 톤별 설명과 어울리는 색, 시즌 팔레트와 인기 립·블러셔 제품 색으로 가상 체험
- 테스트: Vitest (색 분석 순수 함수) · Playwright (가짜 카메라 + 고정 셀카 fixture)
- CI: GitHub Actions (lint → typecheck → unit → e2e)

## 프라이버시 설계

"서버로 안 보낸다"를 말로만 하지 않고 브라우저가 강제하게 했습니다.

| 장치 | 내용 |
|---|---|
| 온디바이스 추론 | MediaPipe Face Landmarker가 wasm + WebGL로 브라우저에서 돌아갑니다. 프레임은 `<canvas>` 밖으로 나가지 않습니다. |
| 모델·wasm 자체 호스팅 | `public/models/face_landmarker.task`(커밋)와 `public/wasm/<tasks-vision 버전>/`(postinstall·build 때 node_modules에서 복사, 버전 경로라 immutable 캐시가 예전 파일을 붙잡지 않음). CDN을 쓰지 않습니다. |
| CSP `connect-src 'self'` | `next.config.ts`에서 모든 응답에 붙습니다. 외부 도메인으로의 fetch/XHR/WebSocket이 브라우저 레벨에서 차단됩니다. 실제로 tasks-vision이 `odml.pa.googleapis.com/v1/log`로 보내려는 텔레메트리가 이 정책에 막히는 걸 E2E 콘솔에서 확인할 수 있습니다. |
| 공유 URL | `/r/{tone}` 뿐입니다 (예: `/r/spring-light`). 측정값, 이미지, 식별자 어떤 것도 싣지 않습니다. |
| 공유 카드 | `next/og`로 서버에서 그리는 OG 이미지는 톤 이름과 팔레트만 담습니다. 얼굴이 들어갈 입력 자체가 없습니다. |
| 방문 통계 | Umami(쿠키 없음)를 `/stats`로 프록시해서 씁니다. 브라우저는 우리 도메인만 보고, 이벤트에는 단계 이름과 톤 이름만 싣습니다. |

## 아키텍처

```
src/
  app/
    page.tsx                        랜딩. 서버 컴포넌트, 클라이언트 JS 거의 없음
    try/page.tsx                    카메라·업로드 → 조명 체크 → 측정 → 립 체험 (한 화면)
    r/[tone]/page.tsx               결과 페이지. 12톤 + 시즌 별칭 4개 정적 생성
    r/[tone]/opengraph-image.tsx    톤별 공유 카드. 한글 서브셋 폰트 동봉, 정적 생성
    opengraph-image.tsx             사이트 공통 링크 썸네일
    icon.tsx, apple-icon.tsx        파비콘. BrandMark를 next/og로 렌더
  features/
    camera/      useCameraStream (getUserMedia, 권한 분기, iOS)
    landmark/    useFaceLandmarker (tasks-vision lazy import), indices, geometry
    analysis/    color · sample · lighting · tone · explain · constants  ← 순수 함수, Vitest 대상
                 frame.ts  ← 캔버스에서 픽셀을 읽어 순수 함수에 넘기는 유일한 DOM 어댑터
    lipTryOn/    render.ts (마스크·페더링·블렌딩), ColorPicker
    try/         useTryOnLoop (rAF 루프), useStillAnalysis (업로드), TrySession 및 하위 UI
    recommend/   palettes(시즌·12톤 설명), products.json(인기 립·블러셔), getProducts, affiliate, ProductCard
    analytics/   track (Umami 이벤트), Analytics (스크립트 로더)
    share/       resultUrl, ShareButtons (Web Share API, 복사 fallback)
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

**12시즌 세부 타입.** Sci\ART 방식의 "가장 두드러진 특징"을 따릅니다. 세 축이 임계값에서 벗어난 정도를 `AXIS_MARGIN`(hue 4°, ITA 6°, chroma 4) 단위로 점수화하고, 시즌에 허용된 세 타입 중 점수가 가장 큰 쪽을 고릅니다.

| 시즌 | 허용 타입 | 점수 |
|---|---|---|
| 봄 | 라이트 · 브라이트 · 트루 | light = (ITA − 41)/6, bright = (C* − 20)/4, true = 웜·쿨 초과 거리/4 |
| 여름 | 라이트 · 뮤트 · 트루 | soft = (20 − C*)/4 |
| 가을 | 뮤트 · 딥 · 트루 | deep = (41 − ITA)/6 |
| 겨울 | 딥 · 브라이트 · 트루 | |

**근거 문장.** `explainTone`이 측정 수치를 임계값과 함께 문장으로 풀어 결과 화면에 보여 줍니다. "색상각 61°인데 57° 이상이면 웜으로 봐요" 같은 식이라 사용자가 숫자의 의미를 알 수 있습니다.

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

## 인기 제품 데이터

`products.json`은 롬앤, 맥, 디올, 나스, 클리니크 같은 브랜드의 널리 알려진 립·블러셔 색을 손으로 고른 목록입니다. 쇼핑몰을 크롤링하지 않았고, `hex`는 공식 색상명을 보고 적은 근사치라 UI에도 그렇게 표기합니다. 체험 화면에서는 이 색을 시즌 팔레트와 함께 입술·볼에 얹어 볼 수 있습니다.

## 사용 흐름 분석 (Umami)

쿠키 없는 Umami Cloud(무료, 월 10만 이벤트)를 씁니다. 스크립트와 수집 엔드포인트를 `/stats`로 리라이트해서 브라우저는 우리 도메인만 호출하므로 CSP `connect-src 'self'`가 그대로 유지됩니다.

1. Website ID는 `features/analytics/Analytics.tsx`에 기본값으로 들어 있습니다 (HTML에 노출되는 공개값). 바꾸려면 환경변수 `NEXT_PUBLIC_UMAMI_WEBSITE_ID`로 덮어씁니다.
2. `data-domains`로 배포 도메인에서만 수집합니다. 로컬 개발과 E2E는 집계되지 않습니다. 도메인을 바꾸면 `NEXT_PUBLIC_UMAMI_DOMAINS`를 같이 바꿉니다.
3. 이벤트: `try-start`(source), `camera-denied`, `model-error`, `face-not-found`, `measure-done`(tone, confidence, source), `swatch-select`(kind, product), `share`, `card-download`, `product-click`(id). 얼굴·측정 수치는 싣지 않습니다. `features/analytics/track.ts`에 타입으로 고정되어 있습니다.

## 개발

```bash
pnpm install          # postinstall이 tasks-vision wasm을 public/wasm/<버전>으로 복사
pnpm dev              # http://localhost:3000  (카메라는 localhost 또는 HTTPS에서만)
pnpm dev --experimental-https   # 폰에서 테스트할 때
pnpm lint && pnpm typecheck && pnpm test
pnpm e2e              # Playwright. 가짜 카메라 플래그 + e2e/fixtures/face.jpg
pnpm build
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

E2E fixture `e2e/fixtures/face.jpg`는 MediaPipe 공식 예제 이미지(미국 정부 공개 초상, 퍼블릭 도메인)입니다.

## 배포

Vercel 기준으로 맞춰져 있습니다. `headers()`, `next/og`, 정적 생성이 추가 설정 없이 동작하고, HTTPS가 기본이라 카메라 권한도 바로 됩니다. `metadataBase`는 `VERCEL_PROJECT_PRODUCTION_URL`을 자동으로 쓰고, 다른 호스팅이면 `NEXT_PUBLIC_SITE_URL`을 줍니다.

Vercel Hobby 플랜은 비상업 용도 조건이 있어서, 광고·제휴 수익이 실제로 붙는 시점에는 Pro 또는 Cloudflare(OpenNext)로 옮깁니다. 코드에 플랫폼 종속은 없습니다.

## 수익화 연결

**쿠팡 파트너스 (제품 카드 링크)**
- 파트너스 ID는 `features/recommend/affiliate.ts`에 있다. 링크에 노출되는 공개값이다.
- `products.json`의 각 항목은 `keyword`로 쿠팡 검색 결과 제휴 링크(`link.coupang.com/re/AFFSRP?lptag=…&subid=tonepick&pageKey=검색어`)를 만든다. 검색어는 `q`가 아니라 `pageKey`다. `q`는 쿠팡 홈으로 떨어진다. 특정 상품을 밀고 싶으면 콘솔에서 만든 상품 링크를 `url`에 넣으면 그게 우선한다. 카드의 `rel="sponsored"`와 결과 페이지의 수수료 고지 문구는 들어 있다.
- 최종 승인(누적 판매 금액 기준, 콘솔 공지에서 확인)이 나야 정산과 Open API(상품 검색·딥링크)를 쓸 수 있다. API를 쓰게 되면 `getProducts`만 fetch로 바꾼다.

개인정보처리방침은 `/privacy`에 있고 푸터에서 링크된다. 수집하는 개인정보가 없어 연락처 대신 GitHub 이슈를 안내한다. 광고 네트워크는 붙이지 않았다.

## 데이터 교체

제품은 `features/recommend/products.json` 목업이고 `getProducts(season)` 하나로만 읽습니다. 쇼핑몰 API로 바꿀 때 이 함수만 fetch로 교체하면 됩니다. 쇼핑몰 크롤링은 하지 않습니다. 제휴 링크는 `url` 필드의 placeholder를 바꿉니다.

## 다음 단계

- 12시즌 세분화 (chroma·ITA 2차 분할)
- 실측 FPS가 모바일에서 30 미만이면 랜드마커를 Web Worker로
- 실제 광고 스크립트 연결 시 `/r` 라우트 CSP 완화
- `features/analysis/constants.ts` 임계값을 실제 사용자 샘플로 튜닝
