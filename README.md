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
| 폰트 자체 호스팅 | 제목은 고운바탕(`next/font/google`이 빌드 때 받아 자체 호스팅), 본문은 Pretendard(npm `pretendard`의 글자 범위별 분할 파일). 둘 다 SIL OFL 1.1이라 무료로 상업 이용할 수 있고, 화면에 쓰인 글자 범위만 받습니다. |
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
    camera/      useCameraStream (getUserMedia, 권한 분기, iOS), useWhiteBalanceLock (흰 종이로 화이트밸런스 고정)
    landmark/    useFaceLandmarker (tasks-vision lazy import), indices, geometry
    analysis/    color · sample · lighting · tone · explain · constants  ← 순수 함수, Vitest 대상
                 frame.ts  ← 캔버스에서 픽셀을 읽어 순수 함수에 넘기는 유일한 DOM 어댑터
    lipTryOn/    render.ts (마스크·페더링), tint.ts (선형 RGB 발색 모델, 순수 함수), ColorPicker
    try/         useTryOnLoop (rAF 루프), useStillAnalysis (업로드), TrySession 및 하위 UI
    recommend/   palettes(시즌·12톤 설명), products.json(인기 립·블러셔), harmony(립 어울림 점수), drape(셀프 비교), getProducts, affiliate
    myShade/     measure(흰 종이 스와치 → 반사율), store(내 제품 색, 이 브라우저에만), ShadeScanner
    analytics/   track (Umami 이벤트), Analytics (스크립트 로더)
    share/       resultUrl, ShareButtons (Web Share API, 복사 fallback)
  stores/analysisStore.ts           Zustand. 단계·조명·결과·선택 색
  types/                            도메인 타입
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

## 색 분석 알고리즘

전부 `features/analysis/`의 순수 함수이고 임계값은 `constants.ts` 한 곳에 있습니다. 설계 근거는 아래 [근거](#근거-문헌과-fairface-실측) 절에 있습니다.

**샘플링.** 양 볼 6곳(랜드마크 50·280 사과 부위, 101·330 아래, 123·352 바깥)과 이마 4곳(151 중앙, 108·337 좌우, 9 미간)을 중심으로 정사각 패치를 읽습니다. 한 변은 눈 바깥꼬리(33↔263) 거리의 25%라 얼굴 크기와 무관하게 같은 비율이 잡힙니다. 한국 측색 연구에서 전문가 웜/쿨 판정과 유의하게 이어지는 부위는 볼뿐이고, 촬영 각도에 가장 안정한 부위는 이마입니다. 턱·코 옆·눈 밑은 그늘과 혈류로 어둡고 노랗게 나와 뺐습니다. 10곳의 중앙값이라 안경·앞머리·손이 두세 곳을 가려도 버팁니다. 정지 사진은 화면 표시(720px)보다 큰 1080px에서 잽니다. 치아·흰자 기준은 픽셀 수가 생명이라서입니다.

**이상치 제거.**
1. 픽셀 사전 제거: 어느 채널이든 250 이상이면 스펙큘러 하이라이트, 인코딩 휘도 40 미만이면 그림자·머리카락·눈썹으로 보고 버립니다.
2. Lab 변환 후 채널별 median ± 3×MAD 밖을 버립니다. 표준편차는 이상치 자체에 끌려가지만 MAD는 끌려가지 않아서, 안경테나 머리카락이 패치에 걸려도 버팁니다. 3×MAD는 정규분포 기준 약 2σ입니다.
3. 남은 픽셀의 median → 패치, 열 패치의 median → 프레임, 20프레임의 median → 최종. mean 대신 median을 쓰는 이유는 잔여 이상치와 프레임 노이즈에 강하기 때문입니다.

**조명 보정(기준 계층).** 같은 사람도 전구색·형광등·노출에 따라 피부 Lab이 크게 흔들립니다. 사진 안에서 쓸 수 있는 가장 믿을 만한 기준을 골라 선형 RGB 게인(von Kries)으로 되돌립니다.

| 순서 | 기준 | 찾는 법 | 보정 | 조명 추정 잡음(log r/g 분산) |
|---|---|---|---|---|
| 1 | 이용자가 찍은 흰색 | 결과 화면에서 흰 종이·흰 벽을 누름 | 완전 | 가장 낮음(기준 반사율을 앎) |
| 2 | 흰 종이로 고정한 화이트밸런스 | 실시간 카메라에서 측정 전 흰 종이를 화면 가득 비추고 고정 | 색은 종이로 완전, 밝기는 아래 기준 | 낮음 |
| 3 | 치아(+눈 흰자) | 입 안쪽 링 안에서 밝고(휘도 ≥ 110) 색이 옅은(채도 < 0.3) 픽셀 20개 이상. 흰자도 보이면 잡음 역수 가중(0.65 : 0.35)으로 섞음 | 완전 | 0.012 |
| 4 | 눈 흰자 | 눈 윤곽 폴리곤에서 홍채 원(테두리 × 1.15)을 뺀 뒤 밝은 순 25%, 눈당 10픽셀 이상 | 완전 | 0.022 |
| 5 | 배경 | 얼굴 bbox 밖 64×64 축소본 평균(gray-world) | 절반(`SCENE_STRENGTH` 0.5) | 0.063 |

**화이트밸런스 고정.** 폰 카메라는 얼굴을 찾으면 피부를 "표준 피부색" 쪽으로 끌어당기는 자동 화이트밸런스를 씁니다(Intel WO2015030705, Fujifilm US8520091, Imatest·Monk EI 2026). 흰 종이만 보일 때 `MediaStreamTrack`의 `whiteBalanceMode: "manual"`로 고정하면 얼굴이 들어와도 카메라가 색을 바꾸지 않습니다. 고정한 순간 화면 가운데 40%를 흰 종이로 재고, 그 색 비율로 피부를 되돌립니다. 고정 뒤에도 자동 노출은 움직이므로(iOS는 노출을 잠글 수 없음) 밝기 게인은 치아·흰자·배경에서 가져옵니다(`withChroma`). 아이폰 사파리 17.4 이상과 안드로이드 크롬에서 되고, `getCapabilities`로 지원할 때만 버튼이 보이며, 적용 여부는 `getSettings`로 다시 확인합니다.

**치아와 피부색의 상관.** 치아색은 완전한 흰색이 아니고 피부색과 같이 움직인다는 치과 연구가 있어서, 치아만 기준으로 쓰면 언더톤 일부가 같이 지워질 수 있습니다. 흰자가 같이 보이면 섞어서 그 몫을 줄입니다. 전문가 라벨이 없어 얼마나 지워지는지는 아직 재지 못했습니다.

치아·흰자는 피부보다 1.05배 이상 밝고 선형 채도가 0.6 이하일 때만 믿습니다(감은 눈·그늘진 입·입술·충혈 제외). 기준이 `TEETH_REFERENCE`·`SCLERA_REFERENCE`(FairFace 중앙값)가 되게 게인을 곱하므로 배경 보정 공간과 같은 임계값을 씁니다. 배경은 벽·옷 색이 섞여 있어 로그 공간에서 절반만 되돌리고 게인을 0.5~2배로 묶습니다. 완전히 되돌리면 사람 간 색상각 IQR이 15.2° → 17.3°로 늘어 배경 내용물 색이 섞여 듭니다. 어떤 기준을 썼는지는 결과 화면에 표시되고, 여러 장을 합치면 가장 약한 기준으로 봅니다. 배경 기준이면 확신도를 "보통"까지만 줍니다.

같은 게인으로 입술(바깥 윤곽에서 입 안쪽을 뺀 영역)의 색도 재서 립 어울림 점수에 씁니다. 게인을 거꾸로 돌린 값은 "이 사진에서 완전한 흰색이 찍혔을 값"이라 립·블러셔를 사진의 조명 아래 색으로 칠할 때 씁니다.

**색공간.** sRGB → 감마 해제 → XYZ(D65) → CIELAB. 피부색 문헌이 전부 Lab 기준이고 L/a/b가 명도·붉은기·노란기로 분리됩니다.

**지표.**
- ITA° = atan((L* − 50) / b*) × 180/π. Chardon(1991)의 피부 밝기 지표. Del Bino(2018) 경계: very light > 55, light 41~55, intermediate 28~41, tan 10~28, brown −30~10, dark < −30.
- hue h° = atan2(b*, a*). 노란기 대 붉은기. 클수록 골드(웜), 작을수록 핑크(쿨).
- chroma C* = √(a*² + b*²). 선명 vs 뮤트.
- b*. 황색도. 뉴트럴 구간에서 웜/쿨을 가르는 데 씁니다.

**판정.** 임계값은 FairFace(CC BY 4.0) 검증 세트의 동아시아인 10세 이상 1,281장(얼굴 인식 1,176장)을 위 파이프라인에 그대로 돌려 정했습니다. 사진은 레포·서비스 어디에도 들어가지 않고 측정값만 씁니다.

| 축 | 지표 | 값 | 근거 |
|---|---|---|---|
| 웜/쿨 | h° | ≥ 53.7 웜, ≤ 47.7 쿨, 사이 뉴트럴 | FairFace 중앙값 50.7° ±3°. 카메라 사진의 색상각 IQR(15.8°)이 분광측색 문헌의 한국인 표본 SD(±3~4°)보다 3배 넓어 중앙 ±3°(21%)는 뉴트럴로 둔다 |
| 뉴트럴일 때 웜/쿨 | b* | ≥ 18.3 웜 | 한국 측색 연구 3편에서 전문가 웜/쿨과 이어진 변수는 색상각이 아니라 볼의 b*였다. 값은 FairFace 중앙값 |
| 명/암 | ITA | ≥ 9.5 light, 미만 deep | 보정 공간에서의 중앙값. 혈류만으로 ITA가 16~31° 움직여 두 단계 이상 쪼개지 않는다 |
| 선명/뮤트 | C* | ≥ 24 clear, 미만 muted | 중앙값 |

시즌 = 웜/쿨 × 명/암 (웜·light 봄, 웜·deep 가을, 쿨·light 여름, 쿨·deep 겨울). 확신도는 각 축에서 임계값까지의 거리로 높음·보통·낮음만 보여 주고 숫자는 노출하지 않습니다. 뉴트럴은 항상 "낮음", 배경 기준 보정은 "보통"까지입니다.

이 파이프라인으로 FairFace 동아시아인은 봄 28% · 여름 22% · 가을 24% · 겨울 26%로 나뉘고, 조명 변형 6종(전구색 약·강, 형광, 그늘, −0.7EV, +0.6EV)에 대한 시즌 일치율은 86.8%(이전 84.1%), 12톤 일치율은 74.5%(이전 64.3%)입니다. 치아·흰자 기준이 잡힌 사진은 각각 99.9%·95.2%, 배경 기준은 83.5%입니다. 이전 배포 임계값은 같은 데이터에서 겨울 38%로 쏠려 있었습니다.

**12시즌 세부 타입.** Sci\ART 방식의 "가장 두드러진 특징"을 따릅니다. 세 축이 임계값에서 벗어난 정도를 `AXIS_MARGIN`(hue 4°, ITA 13°, chroma 3. 각 지표 IQR의 1/4) 단위로 점수화하고, 시즌에 허용된 세 타입 중 점수가 가장 큰 쪽을 고릅니다.

| 시즌 | 허용 타입 | 점수 |
|---|---|---|
| 봄 | 라이트 · 브라이트 · 트루 | light = (ITA − 9.5)/13, bright = (C* − 24)/3, true = 웜·쿨 초과 거리/4 |
| 여름 | 라이트 · 뮤트 · 트루 | soft = (24 − C*)/3 |
| 가을 | 뮤트 · 딥 · 트루 | deep = (9.5 − ITA)/13 |
| 겨울 | 딥 · 브라이트 · 트루 | |

**결과 확률.** 셀프 카메라로 4시즌을 맞히는 공개 연구의 최고치는 약 55%(상위 2개 안에 정답 84%)라서 한 시즌만 단정하지 않고 "가능성 62% · 다음 후보 봄 웜 24%"처럼 보여 줍니다. 웜/쿨과 명/암을 각각 "기준선에서 떨어진 거리 ÷ (`AXIS_MARGIN` × 기준별 흔들림)"의 정규 누적확률로 보고 곱합니다. 기준별 흔들림은 조명 추정 잡음 분산의 제곱근 비라 치아 1, 흰자 1.35, 배경 2.29, 보정 없음 3입니다. 뉴트럴 구간은 황색도 쪽으로 기울이되 색상각 거리만큼만 확신합니다. 정확히 동점이 아니면 1등은 위 판정과 같습니다.

**흰색 기준 보정.** 결과 화면에서 사진 속 흰 종이·흰 벽·흰 옷을 누르면, 그 자리(이미지 폭 3% 정사각형)의 평균 선형 RGB를 흰색으로 삼아 조명을 완전히 되돌립니다. 피부보다 1.1배 이상 밝지 않거나, 하얗게 날아갔거나(클리핑 30% 초과), 색이 짙으면(선형 채도 0.65 초과) 받지 않습니다. 흰색은 배경 보정 공간의 "흰 종이" 값으로 맞춥니다: 색 비율은 `SCENE_REFERENCE`, 휘도는 카메라의 18% 회색 노출 관례에 흰 종이 반사율 85%를 적용한 0.62.

**여러 장 합치기.** 사진은 한 번에 5장까지 고를 수 있고, 결과 화면에서 사진을 더하거나 카메라로 한 번 더 잴 수 있습니다(최대 5번). 판정은 장별 Lab의 채널별 중앙값으로 내고, 장마다 시즌이 갈리면 확신도를 낮음으로 내리고 경계에 있다고 알려 줍니다. 결과 화면 위쪽 탭으로 합친 결과와 사진 한 장씩의 결과를 오갈 수 있고, 고른 사진이 캔버스에 떠서 그 사진으로 립·블러셔를 발라 볼 수 있습니다.

**근거 문장.** `explainTone`이 측정 수치를 임계값과 함께 문장으로 풀어 결과 화면에 보여 줍니다. "색상각 61°인데 53.7° 이상이면 웜으로 봐요", "치아를 기준으로 조명을 되돌렸어요" 같은 식이라 사용자가 숫자와 보정의 의미를 알 수 있습니다.

**조명 체크.** 측정 전 실시간 배지. 얼굴 패치 평균 휘도 70 미만이면 어두움, 200 초과 또는 클리핑 5% 초과면 과노출. 프레임을 64×48로 줄여 gray-world(장면 평균은 회색에 가깝다)로 R/G·B/G가 0.8~1.25를 벗어나면 색편향. 양 볼 L* 차이가 15를 넘으면 측면 조명. 얼굴 bbox 폭이 프레임의 25% 미만이면 가까이 오라고 합니다.

**한계.** 사진 한 장으로 웜/쿨을 가르는 일은 문헌상으로도 어렵습니다. 한국 측색 연구에서 전문가 웜·쿨 집단의 색상각 차이는 1~2°로 표본 SD(±3~4°)보다 작고, 연구마다 방향이 다르며, 겨울형이 가장 노랗게 나오는 연구도 있습니다. 전문가 간 일치도(kappa)를 보고한 논문은 찾지 못했고, 일본 색채학회 연구(Maki & Yamamoto 1998)는 옐로베이스·블루베이스 집단이 아예 나뉘지 않는다고 보고했습니다. 셀카 4시즌 공개 최고치는 CNN·XGBoost·최근접 중심 모두 약 55%에서 멈추고(12시즌 약 32%, 웜/쿨 약 70%), 이는 모델보다 정답 라벨의 흔들림이 만든 천장으로 보입니다. 스마트폰 a*는 분광계와 r≈0.2라 색상각의 분모가 흔들리고, 자동 노출 때문에 ITA는 조명이 분산의 1/4 이상을 설명합니다. 이 서비스는 치아·흰자·흰색 기준으로 조명 요인을 줄이고, 못 줄인 만큼 확신도를 낮춰 보여 줍니다. FairFace에는 퍼스널 컬러 정답 라벨이 없어서 "맞혔는지"가 아니라 "분포가 고른지·조명에 덜 흔들리는지"만 검증했습니다. 그래서 "재미로"이고 UI에 그대로 적어 두었습니다. 전문가 진단 결과가 모이면(아래 [진단 결과 모으기](#진단-결과-모으기-선택-기능)) 그걸로 기준선을 다시 맞춥니다.

### 근거: 문헌과 FairFace 실측

설계를 정할 때 본 문헌과, FairFace 동아시아인 1,176장으로 직접 잰 수치입니다.

**부위·변수**
- 이은영·박길순, 여대생의 퍼스널 컬러 시스템 유형에 따른 얼굴색 분석, 복식문화연구 20(2), 2012. 전문가 3인 드레이핑 136명. 웜/쿨을 가르는 변수는 볼의 a*·b*·L*(판별식 일치율 81.6%)이고 색상각 차이는 1.3°. 이마는 b*만 약하게 유의.
- 김용현·오유석·이정훈, 퍼스널 컬러 스킨 톤 유형 분류의 정량적 평가 모델 구축, 한국의류학회지 42(1), 2018. 993명 화장 전후 비교에서 볼의 황색도만 화장 영향이 없어 볼을 진단 부위로 선정. 블루/옐로 베이스는 b* 단일 축.
- 최민령, 퍼스널컬러 유형 진단 알고리즘 생성을 위한 얼굴색도 분포, 한국미용학회지 27(1), 2021. 20대 496명. b*가 핵심 변수, 유형별 색상각은 49.5~51.9°로 방향 없음.
- Kang & Kim, Region-Specific Calibration … Korean Facial Skin, arXiv 2512.21988, 2025. 한국인 965명, 폰 vs DSLR. 턱이 촬영각에 가장 불안정, 이마가 가장 안정. 소비자 폰은 a*·b*가 계통적으로 눌린다.
- Ouyang et al., Smartphone-Based Skin Colorimeter, Clin Cosmet Investig Dermatol 19, 2026. 스마트폰 vs 분광계 상관: L* 0.71~0.77, b* 0.59~0.75, ITA −0.81~−0.87, a* 0.21~0.28.
- Harunani et al., The optical origin of the human skin color 'banana' in CIELAB, bioRxiv 2026. 같은 멜라닌에서 혈류만으로 ITA가 16~31° 움직인다.
- Alipour et al., Limitations of ITA … Under Uncontrolled Imaging Conditions, Skin Res Technol 32(8), 2026. 비통제 사진의 고정 ITA 임계 → 피부형 정확도 22.9%.

**조명 기준**
- Choi, Choi, Suk (KAIST), The human sclera and pupil as the calibration targets, IS&T Electronic Imaging 2017; 특허 US10984281. 공막(밝은 상위 10%)과 동공을 흰/검 기준으로 써서 한국 여성 348명 분광 DB로 검증. 여기서는 작은 눈에서도 픽셀이 남도록 상위 25%를 쓴다(FairFace에서 치아와의 일치가 10%·50%보다 좋았다).
- Mbatha, Booysen, Theart, Skin Tone Estimation under Diverse Lighting Conditions, J Imaging 10(5), 2024. 285명 × 15조명. Grey World 적용이 정확도를 58.1 → 55.1%로 낮춘다. 전역 통계 화이트밸런스는 얼굴 사진에 역효과라 배경 기준은 절반만 쓴다.
- Tsumura et al., Image-based skin color and texture analysis, SIGGRAPH 2003. log-RGB에서 음영은 (1,1,1) 방향, 조명색은 상수 오프셋, 색소 벡터는 조명·화이트밸런스 불변. 오프셋은 피부 밖 기준으로만 지울 수 있다.
- Bianco & Schettini, Color Constancy Using Faces, CVPR 2012. 피부 자체를 조명 단서로 쓰는 방법. 웜/쿨 판별에 쓰면 피부색 차이가 지워지는 순환이라 쓰지 않았다.

**정확도의 천장과 진단 자체의 신뢰도**
- Stacchio et al., Deep Armocromia, ECCV 2024 Workshops. 4,920장, 4시즌 55.4%·12시즌 31.8%. Ou & Chan, Lumina, IAIT 2026: 같은 데이터에 피부·머리·눈 Lab 특징 XGBoost 55.2%(상위 2개 84.3%). Dinh, Leiden 학사 논문 2026: 웜/쿨 70.2%, 고/저대비 75.6%.
- Maki & Yamamoto, 日本色彩学会誌 22(3), 1998. 25명 드레이핑에서 옐로·블루베이스형 집단으로 나눌 수 없었고, 어울림의 개인차는 머리색이 가장 잘 설명했다.
- 이·박 2012의 81.6%는 기저율(쿨 76.5%) 대비 Cohen's κ 약 0.57이고 교차검증이 없다.
- 김도은·김영삼, Asian J Beauty Cosmetol 18(3), 2020. 60명, 드레이프 진단과 립 발라 보기의 체감 변화가 대부분 다르지 않았다. 셀프 비교의 근거.

**립과 피부의 어울림**
- Hirayama, Yamamoto, Yamazaki, Kimura (POLA), 肌色と似合うリップカラーの色彩調和に関する研究, 粧技誌 32(2), 1998. 립 17색 × 피부 5색, 평가자 137명. 어울림은 피부색 자체보다 립과 피부의 차이가 결정하고(수량화 I류 R=0.84), 영향은 명도차 > 색상차 > 채도차. 립이 피부보다 밝거나 같으면 나쁘고, 색상차는 먼셀 100분할 9~19단계가 가장 좋았다.
- Stephen & McKeegan, Perception 39, 2010; Porcheron et al., PLoS ONE 2013. 입술 a* 대비가 클수록 매력·여성성이 높고 젊어 보인다.
- Kobayashi, Matsushita, Morikawa, i-Perception 8(4), 2017. 어두운 입술은 피부를 더 어두워 보이게 했다(d=0.58).
- 민혜조, 원광대 석사논문 2011. 한국 20대 여성 500명 맨입술 평균 L* 47.6, a* 20.2, b* 13.6. 입술을 못 읽었을 때 쓰는 입술-피부 차이의 근거.

**발색과 제품 색**
- Shiseido US10939742, Panasonic US9603437. 립 렌더링은 입술의 평균 밝기를 제품 밝기로 옮기고 결(명암)만 남긴다. canvas `color` 합성처럼 입술 밝기를 그대로 쓰면 입술보다 밝은 누드 립이 표현되지 않는다.
- Perfect Corp US10719729. 복사지·지폐·신용카드 같은 생활 속 흰 물체를 카메라 보정 기준으로 쓴다. 상용 가상 체험은 브랜드 공식 hex가 아니라 분광측색으로 잰 SKU를 쓴다(목표 CIEDE2000 ΔE < 2).
- 복사지 형광증백제는 자외선이 많은 햇빛에서 푸르게 찍혀 b* 축으로 ΔE 2.9~8.1 오차를 낸다(CIC 26, 2018). 흰 종이 안내에 실내 조명을 권하는 이유.

**FairFace 실측(이 레포의 파이프라인으로 측정)**
- 세 기준의 쌍별 불일치로 푼 조명 추정 잡음(log r/g 분산, three-cornered hat): 치아 0.012, 흰자 0.022, 배경 0.063.
- 치아 기준이 잡힌 사진에서 사람 간 ITA IQR이 52° → 29.5°로 줄었다(노출 요인 제거). 색상각 IQR은 어떤 보정으로도 15°대에서 줄지 않아, 남은 분산은 카메라 처리·압축·실제 피부 차이다.
- 웜/쿨 변수 후보의 조명 변형 민감도(사람 간 IQR ÷ 변형 이동 중앙값): 색상각 23.5, b* 6.0, 판별식(0.406a*+0.662b*) 6.2. 색상각이 색편향에 4배 강해 1차 변수로 두고 b*는 뉴트럴 구간에서만 쓴다.
- 홍채·눈썹을 노출 기준으로 쓰는 안은 좌우 눈 불일치(log 휘도비 IQR 0.55·1.36)가 커서 버렸다.
- 부위 세트별 조명 불변성은 볼+이마 10곳, 볼만, 전체 14곳이 모두 비슷했고(시즌 일치 84~86%), 이마만은 앞머리·모자로 실패가 3% 많았다.

## 립 어울림 점수

`recommend/harmony.ts`. 립 하나하나에 0~100점을 매겨 결과 화면의 "내 얼굴 기준 어울리는 립"과 발라 보기의 "어울림 N점 · 전체 M개 중 k위"에 씁니다.

1. 분석 공간의 피부·입술을 실제 색 공간으로 옮깁니다. 분석 공간의 피부 중앙값(L* 53·색상각 51°·C* 24)은 한국 여성 볼 분광측색 중앙값(L* 약 60·52°·22)과 색은 거의 같고 밝기만 어두워서, 선형 RGB에 노출 배율 `TRUE_EXPOSURE` 1.33만 곱합니다.
2. 입술 위에 실제로 보일 색을 냅니다. 맨입술 위에 제품을 제형별 덮는 정도(매트 0.9, 벨벳 0.8, 크림·리퀴드 0.75, 글로시 0.5)로 덮고, 비치는 몫에는 제품의 투과색을 겁니다. 렌더링과 같은 모델입니다.
3. 피부와 그 색의 차이로 점수를 냅니다(Hirayama 1998의 순서를 따른 출발값).

```
명도   s_L = tanh((ΔL − 2) / 6) − max(0, ΔL − 25) / 20     ΔL = 피부 L* − 입술 위 L*
색상   s_h = 2·exp(−(창 밖 거리 / 20)²) − 1                 창: 피부 색상각 − 입술 위 색상각 ∈ [30°, 65°]
붉은기 s_a = tanh((입술 위 a* − 피부 a*) / 15)
H = 0.5·s_L + 0.3·s_h + 0.2·s_a                             (−1 ~ 1 → 0 ~ 100점)
최종 = 0.6·H점수 + 0.4·(그 색의 시즌 확률 ÷ 1등 시즌 확률)
```

시즌 확률을 40%만 섞는 이유는 셀카 시즌 판정의 천장이 약 55%라서입니다. 노란 피부는 코랄·레드 쪽으로, 핑크빛 피부는 로즈·베리 쪽으로 창이 옮겨 가서 같은 시즌 안에서도 순서가 사람마다 달라집니다. 블러셔와 피부의 조화를 정량화한 연구는 찾지 못해서 블러셔에는 점수를 매기지 않습니다.

## 립 가상 체험

- 마스크: 입술 바깥 링 20점 + 안쪽 링 20점을 `evenodd`로 채워 입을 벌려도 치아가 빠집니다. 반경이 눈 거리의 1.5%인 블러로 가장자리를 풉니다. `ctx.filter` 미지원 브라우저는 shadowBlur 트릭으로 대신합니다.
- 발색(`lipTryOn/tint.ts`): canvas 합성 모드 대신 입술 bbox의 픽셀을 선형 RGB에서 직접 계산합니다.

```
덮는 몫  = 제품 반사율 × 사진의 흰색 × (픽셀 밝기 / 입술 평균 밝기)^texture
비치는 몫 = 바탕 픽셀 × 제품 투과색(가장 센 채널을 1로 맞춘 제품 색)
결과     = 바탕 + 마스크 × 진하기 × (coverage·덮는 몫 + (1 − coverage)·비치는 몫 − 바탕)
```

  - 사진의 흰색은 측정 때 고른 조명 기준의 게인을 거꾸로 돌린 값이라 어두운 사진에서 립이 혼자 빛나지 않습니다.
  - 바르는 방법별 값: 풀립 coverage 0.8·texture 0.7, 그라데이션 0.85·0.7(안쪽만 남기는 마스크), 글로시 0.5·1(아랫입술 광 추가), 매트 0.95·0.35. 블러셔는 0.45·1. 제형별 안료 함량 순서만 반영한 출발값이라, 같은 제품의 바르기 전·후 사진으로 다시 맞춰야 합니다.
- 셀프 비교(`recommend/drape.ts`): 웜·쿨 팔레트에서 밝기 순으로 같은 자리(하위 20%·중간·상위 20%)의 립을 짝지어 세 번, 고른 쪽 안에서 라이트·딥을 세 번 묻습니다. 자리 쏠림을 막으려고 라운드마다 좌우를 바꾸고, 다수결로 시즌을 내서 측정 결과와 같은지 알려 줍니다.
- 성능: 입력 해상도 720px 상한, 프레임이 밀리면 큐에 쌓지 않고 건너뜀. 발색 계산은 입술·볼 bbox(수천~1만 픽셀)만 합니다. 고급 패널에 FPS 표시.

## 인기 제품 데이터

`products.json`은 롬앤, 맥, 디올, 나스, 클리니크 같은 브랜드의 널리 알려진 립·블러셔 색을 손으로 고른 목록입니다. 쇼핑몰을 크롤링하지 않았고, `hex`는 공식 색상명을 보고 적은 근사치라 UI에도 그렇게 표기합니다. 체험 화면에서는 이 색을 시즌 팔레트와 함께 입술·볼에 얹어 볼 수 있습니다.

한국 브랜드 색을 합법적으로 무료 제공하는 데이터셋은 없습니다. 공개 Makeup API는 2018년에 멈췄고 한국 브랜드가 없으며, 가장 큰 립 색 데이터(LipstickByColor)는 비상업 라이선스(CC BY-NC)이고, 쿠팡 파트너스 API 응답에는 옵션·색 필드가 없습니다. 그래서 색은 직접 잽니다.

**내 제품 색 재기(`myShade/`).** 흰 종이에 제품을 진하게 칠해 찍고, 종이와 칠한 곳을 차례로 누릅니다. 칠한 곳(반사광을 빼려고 밝은 15%를 버린 채널별 중앙값)을 같은 사진의 종이로 나누고 종이 반사율 0.85를 곱해 조명과 무관한 반사율을 냅니다(von Kries). 사진은 저장하지 않고 색 hex와 이름만 이 브라우저(localStorage)에 남으며, 발라 보기 칩의 "내 제품"과 립 순위에 들어가서 "지금 쓰는 립이 몇 위인지, 더 어울리는 제품은 무엇인지"를 보여 줍니다. `products.json`의 근사치도 같은 방법으로 재서 바꿉니다.

## 사용 흐름 분석 (Umami)

쿠키 없는 Umami Cloud(무료, 월 10만 이벤트)를 씁니다. 스크립트와 수집 엔드포인트를 `/stats`로 리라이트해서 브라우저는 우리 도메인만 호출하므로 CSP `connect-src 'self'`가 그대로 유지됩니다.

1. Website ID는 `features/analytics/Analytics.tsx`에 기본값으로 들어 있습니다 (HTML에 노출되는 공개값). 바꾸려면 환경변수 `NEXT_PUBLIC_UMAMI_WEBSITE_ID`로 덮어씁니다.
2. `data-domains`로 배포 도메인에서만 수집합니다. 로컬 개발과 E2E는 집계되지 않습니다. 도메인을 바꾸면 `NEXT_PUBLIC_UMAMI_DOMAINS`를 같이 바꿉니다.
3. 이벤트: `try-start`(source), `camera-denied`, `model-error`, `face-not-found`, `measure-done`(tone, confidence, source), `swatch-select`(kind, product), `wb-lock`, `drape-done`(season, same), `shade-saved`(kind), `share`, `card-download`, `product-click`(id). 얼굴·측정 수치는 싣지 않습니다. `features/analytics/track.ts`에 타입으로 고정되어 있습니다.

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

### 진단 결과 모으기 (선택 기능)

결과 화면의 "전문가에게 퍼스널 컬러 진단을 받아 봤나요?"는 저장소가 연결돼 있을 때만 보입니다.

1. Vercel 프로젝트 → Storage → Marketplace에서 **Upstash for Redis**를 만들어 이 프로젝트에 연결합니다. `KV_REST_API_URL`·`KV_REST_API_TOKEN`이 자동으로 생깁니다. Upstash를 직접 만들면 `UPSTASH_REDIS_REST_URL`·`UPSTASH_REDIS_REST_TOKEN`을 넣어도 됩니다.
2. 모은 데이터를 내려받을 비밀값 `FEEDBACK_ADMIN_TOKEN`을 환경 변수에 넣습니다.
3. 다시 배포합니다. 진단 입력 칸이 켜지는지는 빌드할 때 정해집니다.

내려받기: `curl -H "Authorization: Bearer $FEEDBACK_ADMIN_TOKEN" https://<도메인>/api/feedback`

한 건에는 이용자가 고른 진단(시즌·세부 타입), 톤픽 판정, 측정 숫자(Lab·색상각·ITA), 합친 장수, 소스, 보정 여부, 날짜만 있습니다. 사진이나 사람을 알아볼 값은 없습니다. 충분히 모이면 FairFace로 분포를 맞춘 지금 기준선을 전문가 진단과 맞도록 다시 맞춥니다.

## 검색엔진 등록

`/sitemap.xml`(홈·체험·12개 톤 페이지·개인정보처리방침)과 `/robots.txt`는 코드로 만들어지고, 주소는 `NEXT_PUBLIC_SITE_ORIGIN`을 따릅니다. 시즌만 있는 옛 링크(`/r/spring`)는 canonical로 트루 타입에 합쳐지므로 사이트맵에 넣지 않습니다.

1. **네이버 서치어드바이저**(searchadvisor.naver.com) → 사이트 등록 → "HTML 태그" 방식의 content 값을 Vercel 환경변수 `NEXT_PUBLIC_NAVER_SITE_VERIFICATION`에 넣고 다시 배포 → 소유 확인 → 요청 > 사이트맵 제출에 `https://<도메인>/sitemap.xml`.
2. **구글 서치콘솔**(search.google.com/search-console) → URL 접두어 → "HTML 태그" 방식의 content 값을 `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`에 넣고 다시 배포 → 소유 확인 → Sitemaps에 `sitemap.xml` 제출.

환경변수가 없으면 확인 태그는 HTML에 들어가지 않습니다.

## 수익화 연결

**쿠팡 파트너스 (제품 카드 링크)**
- 파트너스 ID는 `features/recommend/affiliate.ts`에 있다. 링크에 노출되는 공개값이다.
- `products.json`의 각 항목은 `keyword`로 쿠팡 검색 결과 제휴 링크(`link.coupang.com/re/AFFSRP?lptag=…&subid=tonepick&pageKey=검색어`)를 만든다. 검색어는 `q`가 아니라 `pageKey`다. `q`는 쿠팡 홈으로 떨어진다. 특정 상품을 밀고 싶으면 콘솔에서 만든 상품 링크를 `url`에 넣으면 그게 우선한다. 카드의 `rel="sponsored"`와 결과 페이지의 수수료 고지 문구는 들어 있다.
- 최종 승인(누적 판매 금액 기준, 콘솔 공지에서 확인)이 나야 정산과 Open API(상품 검색·딥링크)를 쓸 수 있다. API를 쓰게 되면 `getProducts`만 fetch로 바꾼다.

개인정보처리방침은 `/privacy`에 있고 푸터에서 링크된다. 수집하는 개인정보가 없어 연락처 대신 GitHub 이슈를 안내한다. 광고 네트워크는 붙이지 않았다.

## 데이터 교체

제품은 `features/recommend/products.json` 목업이고 `getProducts(season)` 하나로만 읽습니다. 쇼핑몰 API로 바꿀 때 이 함수만 fetch로 교체하면 됩니다. 쇼핑몰 크롤링은 하지 않습니다. 제휴 링크는 `url` 필드의 placeholder를 바꿉니다.

## 다음 단계

- 진단 결과가 모이면 `features/analysis/constants.ts` 임계값을 전문가 진단과 맞도록 튜닝. 기준(흰색·고정·치아·흰자·배경)별로 따로 본다
- `products.json`의 립·블러셔를 실물로 재서(내 제품 색 재기) 근사치 hex를 바꾸기
- 같은 제품의 바르기 전·후 셀카로 발색 값(coverage·texture)을 맞추기. 렌더 결과와 실제 사진의 ΔE00이 최소가 되게
- 화면을 광원으로 쓰는 두 장 차분(어두운 방에서 흰 화면·검은 화면)은 아이폰 웹에서 노출을 잠글 수 없어 보류. 안드로이드 크롬 전용으로 실측 효과를 보고 결정
- 동공을 검정 기준으로 더해 플레어·블랙 레벨 보정 (KAIST 방식의 나머지 절반)
- 실측 FPS가 모바일에서 30 미만이면 랜드마커를 Web Worker로
- 실제 광고 스크립트 연결 시 `/r` 라우트 CSP 완화
