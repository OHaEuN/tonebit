/**
 * MediaPipe Face Mesh 468점 캐노니컬 인덱스.
 * 디버그 오버레이(고급 > 랜드마크 표시)로 실제 위치를 눈으로 확인할 수 있다.
 */

/** 눈 바깥꼬리 한 쌍. 거리로 얼굴 크기를 정규화한다. */
export const EYE_OUTER_PAIR = [33, 263] as const;

/** 양 눈의 [바깥꼬리, 안쪽꼬리] */
export const EYE_CORNERS = [
  [33, 133],
  [263, 362],
] as const;

/** 홍채 중심(refine 478점 모델에만 있음). 흰자를 찾을 때 쓴다 */
export const IRIS_CENTERS = [468, 473] as const;

/** 피부 샘플링 패치 중심: 양 볼 사과 부위 + 이마 중앙 */
export const SKIN_CENTERS = [50, 280, 151] as const;

/** 블러셔 방향: 각 볼의 [볼 사과, 광대 바깥쪽]. 이 방향으로 길게, 살짝 바깥으로 비켜 바른다 */
export const CHEEK_AXES = [
  [50, 116],
  [280, 345],
] as const;

/** 입꼬리 [왼, 오른] */
export const MOUTH_CORNERS = [61, 291] as const;
/** 윗입술 위 중앙, 아랫입술 아래 중앙 */
export const MOUTH_VERTICAL = [0, 17] as const;
/** 윗입술 안쪽 중앙, 아랫입술 안쪽 중앙 */
export const MOUTH_CENTER = [13, 14] as const;

/** 입술 바깥 윤곽, 시계 방향으로 닫힌 링 */
export const LIP_OUTER = [
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146,
] as const;

/** 입술 안쪽 윤곽(입 벌림 영역). evenodd로 빼서 치아를 제외한다 */
export const LIP_INNER = [
  78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95,
] as const;
