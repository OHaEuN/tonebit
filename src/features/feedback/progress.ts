/** 이보다 적으면 일치율을 공개하지 않는다(몇 건으로 낸 퍼센트는 오해를 부른다) */
export const MIN_TO_SHOW = 20;

/** 결과 화면에 붙이는 "지금까지 몇 명이 알려 줬는지" 한 줄. 모인 전문가 진단 n건 중 matched건이 시즌 일치 */
export function progressText(n: number, matched: number): string {
  if (n === 0) return `${MIN_TO_SHOW}명이 모이면 전문가 진단과의 일치율을 공개해요`;
  if (n < MIN_TO_SHOW) return `지금까지 ${n}명이 알려 줬어요 · ${MIN_TO_SHOW - n}명만 더 모이면 일치율을 공개해요`;
  return `지금까지 ${n.toLocaleString()}명이 알려 줬어요 · 전문가 진단과 ${Math.round((matched / n) * 100)}% 일치`;
}
