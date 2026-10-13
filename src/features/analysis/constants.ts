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

// ---- 판정 ----
/** 웜/쿨: Lab hue angle(°). 동아시아 피부 평균 h≈57°를 중심으로 ±2° 뉴트럴 구간 */
export const HUE_WARM_MIN = 57;
export const HUE_COOL_MAX = 53;
/** 명/암: ITA°. Del Bino(2013) light/intermediate 경계 */
export const ITA_LIGHT_MIN = 41;
/** 선명/뮤트: chroma C*. 피부 C* 16~24의 중앙 */
export const CHROMA_CLEAR_MIN = 20;
/** 확신도: 임계값에서 이 거리 이상이면 high, 절반 이상이면 mid */
export const CONFIDENCE_MARGIN = { hue: 4, ita: 6 } as const;

// ---- 조명 체크 ----
export const LIGHT_LUMA_MIN = 70;
export const LIGHT_LUMA_MAX = 200;
export const LIGHT_CLIP_RATIO_MAX = 0.05;
/** gray-world: 프레임 평균 R/G, B/G가 이 범위를 벗어나면 색편향 */
export const CAST_RATIO_MIN = 0.8;
export const CAST_RATIO_MAX = 1.25;
export const FACE_WIDTH_RATIO_MIN = 0.25;
