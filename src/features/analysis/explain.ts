import type { Subtype, ToneResult } from "@/types/analysis";
import { chroma } from "./color";
import { CHROMA_CLEAR_MIN, HUE_COOL_MAX, HUE_WARM_MIN, ITA_LIGHT_MIN } from "./constants";

export const SUBTYPE_LABEL: Record<Subtype, string> = {
  light: "라이트",
  bright: "브라이트",
  true: "트루",
  soft: "뮤트",
  deep: "딥",
};

const SUBTYPE_REASON: Record<Subtype, string> = {
  light: "밝기",
  deep: "깊이",
  bright: "선명함",
  soft: "부드러운 채도",
  true: "웜·쿨 기운",
};

/** 측정값을 근거 문장으로 바꾼다. 숫자는 임계값과 같이 보여 줘야 의미가 생긴다 */
export function explainTone(r: ToneResult): string[] {
  const hue = r.hue.toFixed(0);
  const ita = r.ita.toFixed(0);
  const c = chroma(r.lab).toFixed(0);
  const lines: string[] = [];

  if (r.undertone === "warm") {
    lines.push(`볼과 이마에서 읽은 피부색은 붉은기보다 노란기가 뚜렷해요. 색상각 ${hue}°인데, ${HUE_WARM_MIN}° 이상이면 웜으로 봐요.`);
  } else if (r.undertone === "cool") {
    lines.push(`볼과 이마에서 읽은 피부색은 노란기보다 붉은기가 뚜렷해요. 색상각 ${hue}°인데, ${HUE_COOL_MAX}° 이하면 쿨로 봐요.`);
  } else {
    lines.push(
      `노란기와 붉은기가 비슷해서 웜·쿨 경계(${HUE_COOL_MAX}~${HUE_WARM_MIN}°)에 있어요. 색상각 ${hue}°. 그래서 밝기와 채도로 시즌을 정했어요.`,
    );
  }

  lines.push(
    `밝기 지표 ITA는 ${ita}°예요. ${ITA_LIGHT_MIN}° 이상이면 라이트, 미만이면 딥으로 보는데 ${r.depth === "light" ? "라이트" : "딥"} 쪽이에요.`,
  );
  lines.push(`채도 C*는 ${c}이에요. ${CHROMA_CLEAR_MIN} 이상이면 선명, 미만이면 뮤트로 보는데 ${r.chroma === "clear" ? "선명한" : "부드러운"} 쪽이에요.`);

  if (r.subtype === "true") {
    lines.push(`밝기나 채도가 특별히 튀지 않고 ${r.undertone === "cool" ? "쿨" : "웜"} 기운이 중심이라 세부 타입은 '트루'예요.`);
  } else {
    lines.push(`세 가지 중 ${SUBTYPE_REASON[r.subtype]}이 가장 두드러져서 세부 타입은 '${SUBTYPE_LABEL[r.subtype]}'예요.`);
  }

  if (r.confidence === "high") lines.push("모든 기준선에서 충분히 떨어져 있어서 확신도가 높아요.");
  else if (r.confidence === "mid") lines.push("일부 지표가 기준선에 가까워서 확신도는 보통이에요.");
  else lines.push("기준선에 걸쳐 있어서 조명이 바뀌면 결과가 달라질 수 있어요.");

  return lines;
}
