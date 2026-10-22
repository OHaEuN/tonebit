import calibration from "./calibration.json";

/**
 * 색 분석 임계값. 전부 "재미로 보는" 수준의 휴리스틱이고 카메라·조명에 따라
 * 흔들리므로 한 곳에 모아 튜닝한다. 각 값의 근거는 README 알고리즘 절 참고.
 */

// ---- 픽셀 사전 제거 ----
/** 어느 채널이든 이 값 이상이면 스펙큘러 하이라이트로 보고 버린다 */
export const CLIP_MAX = 250;
/** 인코딩 휘도(0~255)가 이 값 미만이면 그림자·머리카락·눈썹. L* 약 17 이하에 해당 */
export const LUMA_MIN = 40;
/** 사전 제거 후 이 수보다 적게 남으면 패치를 버린다 */
export const MIN_PIXELS = 20;
/** median ± MAD_K × MAD 밖은 버린다. 정규분포 기준 3×MAD ≈ 2σ */
export const MAD_K = 3;

// ---- 샘플링 ----
/** 패치 한 변 = 눈 바깥꼬리(33↔263) 거리 × 이 비율 */
export const PATCH_RATIO = 0.25;
/** 측정 시 모으는 프레임 수. 30fps 기준 약 0.7초 */
export const MEASURE_FRAMES = 20;
/** 정지 사진은 화면 표시(720px)보다 큰 해상도에서 잰다. 치아·흰자 기준은 픽셀 수가 생명이라 */
export const STILL_ANALYSIS_WIDTH = 1080;

// ---- 조명 보정 (배경 기준, 가장 약한 기준) ----
/**
 * 얼굴 밖 배경의 평균 선형 RGB가 이 값(조명 중립·적정 노출)이 되도록 피부에 게인을 곱한다.
 * FairFace 동아시아인 사진 1,281장 배경의 중앙값이다. r·g·b는 휘도 1 기준의 색 비율, y는 휘도
 */
export const SCENE_REFERENCE = { r: 1.289, g: 0.936, b: 0.759, y: 0.132 } as const;
/**
 * 보정 세기(로그 공간 비율). 배경 색은 조명뿐 아니라 벽·옷 색도 섞여 있어서 절반만 되돌린다.
 * 완전히(1.0) 되돌리면 사람 간 색상각 IQR이 15.2° → 17.3°로 늘어 배경 내용물의 색이 섞여 든다
 */
export const SCENE_STRENGTH = 0.5;
/** 게인 한계. 배경이 거의 검거나 하얗게 날아간 사진에서 결과가 튀지 않게 */
export const SCENE_GAIN_RANGE = [0.5, 2] as const;
/** 배경 평균을 낼 축소 해상도 */
export const SCENE_THUMB = { w: 64, h: 64 } as const;

// ---- 조명 보정 (얼굴 안 기준: 치아·눈 흰자, 완전 보정) ----
/**
 * 치아·흰자는 사람마다 색이 비슷해 배경보다 믿을 만한 조명 기준이다 (KAIST 공막 기준법, Choi·Choi·Suk 2017).
 * 아래 값은 FairFace 동아시아인 사진에서 자동으로 찾은 치아(212장)·흰자(85장)의 선형 RGB 중앙값으로,
 * 기준이 이 색이 되게 게인을 곱하면 배경 보정 공간과 같은 임계값을 쓸 수 있다
 */
export const TEETH_REFERENCE = { r: 0.4452, g: 0.3185, b: 0.2664 } as const;
export const SCLERA_REFERENCE = { r: 0.4203, g: 0.3352, b: 0.3098 } as const;
/**
 * 기준별 조명 추정 잡음. FairFace에서 세 기준의 쌍별 불일치로 푼 분산(log r/g, three-cornered hat).
 * 치아·흰자가 둘 다 보이면 이 역수로 가중 평균하고(치아 0.65 : 흰자 0.35), 결과 확률의 폭도 이 비로 넓힌다.
 * 치아색은 피부색과 함께 움직인다는 치과 연구가 있어서(언더톤 일부가 같이 지워질 수 있음) 흰자를 섞어 그 몫을 줄인다
 */
export const REFERENCE_NOISE = { teeth: 0.012, sclera: 0.022, scene: 0.063 } as const;
/** 완전 보정(흰색·치아·흰자) 게인 한계 */
export const REFERENCE_GAIN_RANGE = [0.25, 4] as const;
/** 기준으로 믿는 조건: 피부보다 이만큼 밝고(감은 눈·그늘 제외), 선형 채도((max−min)/max)가 이 이하(입술·충혈 제외) */
export const REFERENCE_OVER_SKIN = 1.05;
export const REFERENCE_MAX_SATURATION = 0.6;
/** 흰자: 눈 윤곽 안에서 홍채 원(테두리 거리 × 이 비율)을 뺀 뒤 밝은 순으로 이 비율만 남긴다. 눈꺼풀 그늘·혈관이 빠진다 */
export const IRIS_EXCLUDE_RATIO = 1.15;
export const SCLERA_KEEP_BRIGHTEST = 0.25;
/** 눈 하나에서 이만큼은 남아야 쓴다 */
export const SCLERA_MIN_PIXELS = 10;
/** 치아: 입 안쪽 링 안에서 인코딩 휘도 하한·채도 상한을 넘는 픽셀. 이만큼은 있어야 쓴다 */
export const TEETH_MIN_PIXELS = 20;
export const TEETH_MIN_LUMA = 110;
export const TEETH_MAX_SATURATION = 0.3;

// ---- 흰색 기준 보정 (이용자가 사진 속 흰 종이·흰 벽을 누름, 가장 강한 기준) ----
/**
 * 누른 흰색이 이 휘도가 되도록 노출을 맞춘다. 카메라는 장면 평균을 반사율 18% 회색으로 맞추고 흰 종이 반사율은 약 85%라,
 * 배경 기준값(SCENE_REFERENCE.y)의 85/18 ≈ 4.7배를 흰색으로 둔다. 배경 보정과 같은 공간에 놓여 같은 임계값을 쓸 수 있다
 */
export const WHITE_TARGET_Y = 0.62;
/**
 * 흰색으로 믿는 조건: 인코딩 휘도 하한, 피부보다 밝은 정도, 클리핑 비율 상한, 선형 채도((max−min)/max) 상한.
 * 전구색 아래 흰 종이는 선형 채도가 0.6까지 올라가 채도만으론 피부와 못 가르므로 "피부보다 밝다"를 같이 본다
 */
export const WHITE_MIN_LUMA = 90;
export const WHITE_OVER_SKIN = 1.1;
export const WHITE_MAX_CLIPPED = 0.3;
export const WHITE_MAX_SATURATION = 0.65;
/**
 * 흰색 자동 찾기: 같은 조명 아래 흰색은 피부보다 푸르다. 피부 R/B ÷ 후보 R/B가 이 값 이상이어야 한다.
 * 크림색·베이지 벽과 피부를 거른다
 */
export const WHITE_BLUER_THAN_SKIN = 1.4;
/** 흰색 자동 찾기: 후보 영역이 축소본에서 차지해야 하는 최소 비율과 가장자리에서 떨어진 최소 거리(축소본 픽셀) */
export const WHITE_MIN_AREA = 0.01;
export const WHITE_MIN_DEPTH = 2;
/** 흰색 자동 찾기용 축소본 크기 */
export const WHITE_SEARCH_THUMB = { w: 96, h: 96 } as const;
/** 누른 자리에서 평균 낼 정사각형 한 변 = 이미지 폭 × 이 비율 */
export const WHITE_PATCH_RATIO = 0.03;

// ---- 화이트밸런스 고정 (실시간 카메라, 측정 전에 흰 종이를 화면 가득 비춤) ----
/**
 * 폰 카메라는 얼굴이 보이면 피부를 "표준 피부색" 쪽으로 끌어당기는 자동 화이트밸런스를 쓴다(Intel·Fujifilm 특허, Imatest EI 2026).
 * 흰 종이만 보일 때 화이트밸런스를 고정하면 얼굴이 들어와도 카메라가 색을 바꾸지 않는다. 고정 순간 화면 가운데 이 비율 영역을 종이로 잰다
 */
export const LOCK_SAMPLE_RATIO = 0.4;
/** 고정 요청 뒤 실제로 적용된 프레임을 잴 때까지 기다리는 시간(ms) */
export const LOCK_SETTLE_MS = 250;

// ---- 실제 색 공간으로 옮기기 (립 어울림 점수·립 렌더링) ----
/**
 * 분석 공간의 피부 중앙값(FairFace, L* 53·색상각 51°·C* 24)은 한국 여성 볼 분광측색 중앙값(김도은·김영삼 2020: L* 약 60·색상각 52°·C* 22)과
 * 색은 거의 같고 밝기만 어둡다. 선형 RGB에 이 배율을 곱하면 분광측색 밝기에 맞는다. 제품 색(sRGB hex)과 같은 공간에서 비교할 때 쓴다
 */
export const TRUE_EXPOSURE = 1.33;

// ---- 판정 ----
/**
 * 임계값은 FairFace 동아시아인 10세 이상 1,281장(얼굴 인식 1,176장)을 위 파이프라인(볼·이마 10패치, 흰색>치아>흰자>배경 기준)으로
 * 잰 분포의 중앙값이다. 웜/쿨·명/암·선명/뮤트는 절대 기준이 없는 상대 개념이라 모집단 중앙에서 가른다.
 * 한국인 분광측색 문헌(색상각 50~60°, 표본 SD ±3~4°)보다 카메라 사진의 색상각 IQR(15.8°)이 3배 넓으므로
 * 중앙 ±3°는 뉴트럴로 두고 황색도(b*)로 가른다
 */
/**
 * 아래 기준값(색상각 중심·황색도·ITA·채도)은 calibration.json에 있다. 처음 값은 위 FairFace 중앙값이고,
 * 이후엔 이용자가 보내 준 전문가 진단으로 scripts/calibrate.ts가 다시 맞춰 PR을 연다
 */
export const CALIBRATION_VERSION: string = calibration.version;
/** 웜/쿨: Lab hue angle(°). 중심(처음 50.7°) ±3° 뉴트럴 구간 */
export const HUE_NEUTRAL_HALF = 3;
export const HUE_WARM_MIN = calibration.hueCenter + HUE_NEUTRAL_HALF;
export const HUE_COOL_MAX = calibration.hueCenter - HUE_NEUTRAL_HALF;
/**
 * 뉴트럴 구간에서 웜/쿨을 가르는 황색도 b* 하한. 한국 측색 연구 3편(이·박 2012 n=136, 김용현 2018 n=993, 최 2021 n=496)에서
 * 전문가 웜/쿨 판정과 이어지는 변수는 색상각이 아니라 볼의 b*였다. 값은 FairFace 중앙값
 */
export const YELLOW_WARM_MIN = calibration.yellowWarmMin;
/** 명/암: ITA°. 보정 공간에서의 중앙값. 혈류만으로도 ITA가 16~31° 움직여(Harunani 2026) 두 단계 이상 쪼개지 않는다 */
export const ITA_LIGHT_MIN = calibration.itaLightMin;
/** 선명/뮤트: chroma C*. 중앙값 */
export const CHROMA_CLEAR_MIN = calibration.chromaClearMin;
/**
 * 각 축에서 "충분히 떨어졌다"고 보는 거리. 확신도와 12시즌 세부 타입 판정에 같이 쓴다.
 * 각 지표의 사분위 범위(IQR: hue 15.8, ITA 50.8, C* 11.8)의 1/4이다
 */
export const AXIS_MARGIN = { hue: 4, ita: 13, chroma: 3 } as const;

// ---- 조명 체크 ----
export const LIGHT_LUMA_MIN = 70;
export const LIGHT_LUMA_MAX = 200;
export const LIGHT_CLIP_RATIO_MAX = 0.05;
/** gray-world: 프레임 평균 R/G, B/G가 이 범위를 벗어나면 색편향 */
export const CAST_RATIO_MIN = 0.8;
export const CAST_RATIO_MAX = 1.25;
/**
 * 형광등: 프레임 평균 G ÷ (R와 B의 평균)이 이 값 이상. 프레임에 붉은 피부가 섞여 있어 보통 사진은 1보다 작다.
 * FairFace 동아시아인 사진에선 중앙값 0.92, 이 값을 넘는 사진 3%. G를 8~15% 키운 합성 형광등은 20~45%가 걸린다
 */
export const GREEN_CAST_MIN = 1.02;
/** 양 볼 L* 차이가 이보다 크면 측면 조명. FairFace 사진의 상위 약 30%에 해당하는 또렷한 그늘 */
export const SIDE_LIGHT_DELTA_L = 15;
export const FACE_WIDTH_RATIO_MIN = 0.25;
