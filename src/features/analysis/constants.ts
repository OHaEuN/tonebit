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

// ---- 조명 보정 (눈 흰자 기준) ----
/** 흰자 패치에서 휘도 이 분위수 이상만 흰자로 본다. 홍채·속눈썹·눈꺼풀 그늘을 뺀다 */
export const SCLERA_BRIGHT_QUANTILE = 0.6;
/** 흰자 패치(양 눈 합계)에서 최소한 필요한 픽셀 수 */
export const SCLERA_MIN_PIXELS = 16;
/** 흰자 후보 중 하얗게 날아간 픽셀이 이 비율을 넘으면 밝기를 알 수 없어 보정하지 않는다 */
export const SCLERA_MAX_CLIPPED = 0.15;
/**
 * 흰자는 피부보다 이만큼은 밝고(휘도 비), 피부는 흰자보다 이만큼은 붉어야((R/B) 비) 흰자로 믿는다.
 * 눈이 작거나 감겨 피부·눈꺼풀이 잡힌 경우를 거른다. 둘 다 조명 색·밝기가 바뀌어도 변하지 않는 비율이다
 */
export const SCLERA_MIN_CONTRAST = 1.1;
export const SKIN_MIN_REDNESS_OVER_SCLERA = 1.05;
/** 흰자 패치 한 변 = 눈 바깥꼬리 거리 × 이 비율 */
export const SCLERA_PATCH_RATIO = 0.035;
/**
 * 기준 조명(자연광, 적정 노출)에서 흰자가 보이는 선형 RGB. CIELAB (78, 2, 6)에 해당한다.
 * 흰자는 완전한 무채색이 아니라 살짝 노랗고 붉은 기가 있어서 무채색 대신 이 색으로 맞춘다
 */
export const SCLERA_REFERENCE = { r: 0.587, g: 0.522, b: 0.467 } as const;
/** 보정 게인 한계. 흰자가 잘못 잡혔을 때 결과가 크게 망가지지 않게 */
export const EXPOSURE_GAIN_RANGE = [0.5, 2.2] as const;
export const COLOR_GAIN_RANGE = [0.7, 1.45] as const;

// ---- 판정 ----
/** 웜/쿨: Lab hue angle(°). 동아시아 피부 평균 h≈57°를 중심으로 ±2° 뉴트럴 구간 */
export const HUE_WARM_MIN = 57;
export const HUE_COOL_MAX = 53;
/** 명/암: ITA°. Del Bino(2013) light/intermediate 경계 */
export const ITA_LIGHT_MIN = 41;
/** 선명/뮤트: chroma C*. 피부 C* 16~24의 중앙 */
export const CHROMA_CLEAR_MIN = 20;
/**
 * 각 축에서 "충분히 떨어졌다"고 보는 거리. 확신도와 12시즌 세부 타입 판정에 같이 쓴다.
 * hue ±4°는 카메라 WB 흔들림 폭, ITA 6°와 chroma 4는 각 분포 폭의 절반
 */
export const AXIS_MARGIN = { hue: 4, ita: 6, chroma: 4 } as const;

// ---- 조명 체크 ----
export const LIGHT_LUMA_MIN = 70;
export const LIGHT_LUMA_MAX = 200;
export const LIGHT_CLIP_RATIO_MAX = 0.05;
/** gray-world: 프레임 평균 R/G, B/G가 이 범위를 벗어나면 색편향 */
export const CAST_RATIO_MIN = 0.8;
export const CAST_RATIO_MAX = 1.25;
export const FACE_WIDTH_RATIO_MIN = 0.25;
