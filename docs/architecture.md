# 아키텍처와 서버

[← README](../README.md)

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
    camera/      useCameraStream (getUserMedia, 권한 분기, iOS), useWhiteBalanceLock (흰 종이로 화이트밸런스 고정)
    landmark/    useFaceLandmarker (tasks-vision lazy import), indices, geometry
    analysis/    color · sample · lighting · tone · explain · constants  ← 순수 함수, Vitest 대상
                 frame.ts  ← 캔버스에서 픽셀을 읽어 순수 함수에 넘기는 유일한 DOM 어댑터
    lipTryOn/    render.ts (마스크·페더링), tint.ts (선형 RGB 발색 모델, 순수 함수), ColorPicker
    try/         useTryOnLoop (rAF 루프), useStillAnalysis (업로드), TrySession 및 하위 UI
    recommend/   palettes(시즌·12톤 설명), products.json(인기 립·블러셔), harmony(립 어울림 점수), drape(셀프 비교), getProducts, affiliate
    myShade/     measure(흰 종이 스와치 → 반사율), store(내 제품 색, 이 브라우저에만), ShadeScanner
    analytics/   track (Umami 이벤트), Analytics (스크립트 로더)
    feedback/    전문가 진단 입력·검사·저장(Postgres), 일치율 집계 SQL
    advisor/     AI 상담: gemini(REST), tools(검색), agent(함수 호출 루프·폴백), seed(지식 적재), knowledge/
  app/api/       feedback·advisor 라우트 핸들러
  app/accuracy/  전문가 진단 일치율 공개 페이지
  lib/db.ts      Postgres 연결(postgres.js, 풀러용 prepare: false)
    share/       resultUrl, ShareButtons (Web Share API, 복사 fallback)
  stores/analysisStore.ts           Zustand. 단계·조명·결과·선택 색
  types/                            도메인 타입
db/migrations/                      SQL 마이그레이션 (pnpm db:migrate)
scripts/                            migrate · seed-knowledge · calibrate (tsx로 실행)
```

프레임 흐름 (카메라):

```
video frame ─ detectForVideo ─▶ 478 landmarks
   ├─ live 단계      10프레임마다 조명 체크 (얼굴 패치 휘도, gray-world 색편향, 얼굴 크기)
   ├─ measuring 단계 볼·이마 10패치 + 입술 → 대표 Lab → 20프레임 median → 시즌 판정·확률
   └─ 매 프레임      입술 마스크 + 블러셔 → 선형 RGB 발색(tintPixels)
```

업로드 경로는 같은 함수를 한 번만 호출하고, 색을 고를 때마다 정지 화면을 다시 그립니다.

tasks-vision(약 10MB)은 `/try`의 훅이 마운트될 때 `import()`로 처음 내려받습니다. 랜딩 페이지 번들에는 들어가지 않습니다. 모델·wasm은 `Cache-Control: immutable`이라 재방문은 즉시 뜹니다.

## 서버 쪽: 데이터 루프와 AI 상담

얼굴 분석은 계속 브라우저에서만 돕니다. 서버는 숫자와 글만 다룹니다.

```
 브라우저 (온디바이스 분석)                     서버 (Vercel 함수)                         Postgres + pgvector (Supabase)
 ─────────────────────────                   ─────────────────                         ──────────────────────────────
 측정 숫자 + 전문가 진단 ──POST /api/feedback──▶ 필드 검사 → insert ─────────────────────▶ feedback
                                             revalidateTag("accuracy")                      │
 /accuracy ◀──────── 'use cache' (1시간) ◀──── SQL 한 번으로 시즌별·흰색 보정별 일치율 ◀───────┤
                                                                                           │
 GitHub Actions (매주) ── scripts/calibrate.ts: 좌표 하강 + 5겹 교차검증 ◀──────────────────────┘
        └─ 지금보다 2%p 넘게 나으면 calibration.json을 고쳐 PR → 사람이 머지 → Vercel 배포

 질문 + 진단 숫자 ──POST /api/advisor──▶ 에이전트 루프 (Gemini 함수 호출, 최대 5단계)
        ▲ NDJSON 진행 이벤트              ├─ search_products ─▶ products: 벡터 유사도 + 내 팔레트 색차 + 가격대 SQL
        │ ("립을 찾는 중…", 제품 카드,     ├─ search_guides   ─▶ guides: 퍼스널 컬러 가이드 RAG
        │  발라 보기)                      ├─ try_on ─▶ 사진에 바르기(검색에 나온 id만), 답에 나온 검색 결과는 카드로
        └────────────────────────────────┘  한도 초과·장애 → 검색만으로 답하는 폴백, 하루 호출 수는 advisor_usage
```

**한 번 누르는 반응.** 전문가 진단을 받아 본 사람은 적어서, 결과 바로 아래에 "이 결과, 내 생각과 비슷해요?(비슷해요·잘 모르겠어요·달라요)"를, AI 상담 답마다 "도움이 됐어요·아쉬워요"를 둡니다. 판정·조명 기준(또는 답에 붙은 제품 id)만 `result_reactions`·`advisor_ratings`에 남기고 글·사진은 남기지 않습니다. "달라요"를 누르면 전문가 진단 입력으로 이어 주고, 정확도 페이지에 체감 비율(AI가 답한 것과 검색 폴백을 나눠서)을 공개합니다.

**전문가 진단으로 기준 다시 맞추기.** 처음 기준값(웜·쿨 중심 색상각, 뉴트럴일 때 황색도 b*, 라이트·딥 ITA)은 FairFace 분포의 중앙값이라 "사람들 사이에서 고르게 나뉘는" 값일 뿐 전문가 진단과 맞는다는 보장은 없습니다. 그래서 결과 화면에서 전문가 진단을 받아 본 이용자가 동의하고 알려 주면 측정 숫자와 함께 저장하고, `scripts/calibrate.ts`가 매주 기준값을 다시 찾습니다.
- 시즌은 색상각(뉴트럴이면 황색도)으로 웜·쿨, ITA로 라이트·딥이 정해져 축끼리 얽힘이 약해서, 축마다 번갈아 훑는 좌표 하강(3바퀴)으로 일치율 최대값을 찾습니다. 동점이면 덜 움직이는 값.
- 그 데이터로 맞춘 기준을 같은 데이터로 채점하면 낙관적이라, 맞추는 절차 전체를 5겹 교차검증으로 채점하고 지금 기준(이 데이터로 맞춘 게 아님)의 일치율과 비교합니다.
- 50건 미만, 이득 2%p 미만이면 바꾸지 않고, 한 번에 움직이는 폭(색상각 ±3°, 황색도 ±4, ITA ±8°)도 묶어 표본 치우침으로 크게 튀지 않게 합니다.
- 바꿀 만하면 워크플로가 `calibration.json`만 고친 PR을 엽니다(GITHUB_TOKEN PR엔 CI가 돌지 않아 워크플로 안에서 typecheck·test를 먼저 돌림). 피드백마다 그때 쓴 기준 버전과 조명 기준(흰색·고정·치아·흰자·배경)이 남아서 버전별·기준별 성능을 비교할 수 있습니다.

**AI 뷰티 상담 (RAG + 함수 호출 에이전트).** 결과 화면에서 "출근할 때 바를 립 골라 줘" 같은 질문을 하면, 모델이 도구를 골라 쓰며 답합니다.
- 지식: 제품 25개와 퍼스널 컬러 가이드 14조각을 Gemini `gemini-embedding-001`(768차원으로 줄여 정규화)로 임베딩해 pgvector에 둡니다. 제품 설명은 손으로 쓰지 않고 Lab 색에서 "코랄·피치, 웜", "모브·라벤더 핑크, 쿨" 같은 색 낱말을 만들어 붙여서, "차분한 MLBB" 같은 질문이 제품과 만나게 했습니다. 내용 해시가 바뀐 줄만 다시 임베딩해 무료 한도를 아낍니다.
- 검색 점수 = 0.5 × 질문과의 코사인 유사도 + 0.35 × 내 시즌 팔레트와의 색 가까움(가장 가까운 팔레트 색과의 ΔE) + 0.15(내 시즌 제품). 가격대·제형·카테고리는 SQL 조건으로 거릅니다.
- 환각 막기: 카드로 붙거나 사진에 바를 수 있는 제품은 이번 대화에서 검색으로 나온 것뿐입니다. 답에 다른 제품 이름이 나와도 카드가 붙지 않고, 없는 id로 바르라고 하면 도구가 거절합니다. 답은 평문으로만 렌더링합니다.
- 모델 교체·한도에 버티기: 무료 모델은 예고 없이 내려가고(2026-10 `gemini-2.5-flash`가 새 키에 404) 하루 요청 수가 작으며(같은 때 `gemini-3.8-flash` 하루 20회) 자주 붐빕니다(503). `gemini-3.8-flash → gemini-flash-latest → gemini-flash-lite-latest` 순으로 시도하고(`GEMINI_MODEL`에 쉼표로 바꿈), 한도에 걸린 모델은 구글이 알려 준 재시도 시각(RetryInfo)까지, 내려간 모델은 영영 건너뜁니다. 붐빔은 1초 뒤 한 번 다시 시도합니다. 대화 한 번은 처음 응답한 모델에 붙어 가고(함수 호출 다음 턴의 생각 서명이 모델마다 달라서), 그 모델이 중간에 막히면 남은 모델로 질문을 처음부터 다시 돌립니다. 제품 카드는 따로 도구를 부르지 않고 답에 이름이 나온 검색 결과로 붙여서 질문 하나를 보통 모델 호출 2번으로 끝냅니다.
- 무료 등급 지키기: IP별 분당 8회, 하루 전체 호출 수 상한(`ADVISOR_DAILY_CAP`, 기본 200)을 DB에 셉니다. 한도 초과나 장애면 임베딩 없이 키워드 + 색 점수로 검색만 해서 제품을 보여 주는 폴백으로 내려갑니다.
- 진행 상황을 NDJSON으로 흘려 "립을 찾는 중…" → 제품 카드 → 답 순서로 바로 보이고, 카드의 "발라 보기"나 모델의 `try_on`은 그 색을 사진에 바로 바르고 얼굴을 크게 잡은 뷰어를 엽니다.
- 테스트: 각본대로 답하는 가짜 모델로 에이전트 루프를 실제 Postgres 위에서 검증하고(지어낸 id 거절, 폴백, 사용량), CI에서는 가짜 Gemini 서버(`e2e/mock-gemini.mjs`)를 띄워 브라우저 → API → 에이전트 → DB → 화면 동작까지 e2e로 돌립니다.
