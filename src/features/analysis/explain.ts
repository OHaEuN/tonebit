import type { ReferenceSource, Subtype, ToneResult } from "@/types/analysis";
import { chroma } from "./color";
import { AXIS_MARGIN, CHROMA_CLEAR_MIN, HUE_COOL_MAX, HUE_WARM_MIN, ITA_LIGHT_MIN, YELLOW_WARM_MIN } from "./constants";
import { hueDistance, isFullyCorrected } from "./tone";

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

const REFERENCE_REASON: Record<ReferenceSource, string> = {
  white: "직접 찍은 흰색을 기준으로 조명의 색과 밝기를 완전히 되돌렸어요.",
  teeth: "사진 속 치아를 기준으로 조명의 색과 밝기를 되돌렸어요. 치아는 사람마다 색이 비슷해서 배경보다 믿을 만한 기준이에요.",
  sclera: "눈 흰자를 기준으로 조명의 색과 밝기를 되돌렸어요.",
  scene: "배경 색으로 조명을 절반만 보정했어요. 흰 종이를 찍거나, 이가 보이게 웃은 사진을 쓰면 더 정확해져요.",
  none: "배경이 거의 없어서 조명 보정을 못 했어요. 조명에 따라 결과가 달라질 수 있어요.",
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
    const warm = r.lab.b >= YELLOW_WARM_MIN;
    lines.push(
      `노란기와 붉은기가 비슷해서 웜·쿨 경계(${HUE_COOL_MAX}~${HUE_WARM_MIN}°)에 있어요. 색상각 ${hue}°. 이럴 땐 황색도 b*로 가르는데, ${YELLOW_WARM_MIN} 이상이면 웜으로 봐요. b* ${r.lab.b.toFixed(0)}이라 ${warm ? "웜" : "쿨"} 쪽이에요.`,
    );
  }

  lines.push(
    `밝기 지표 ITA는 ${ita}°예요. ${ITA_LIGHT_MIN}° 이상이면 라이트, 미만이면 딥으로 보는데 ${r.depth === "light" ? "라이트" : "딥"} 쪽이에요.`,
  );
  lines.push(`채도 C*는 ${c}이에요. ${CHROMA_CLEAR_MIN} 이상이면 선명, 미만이면 뮤트로 보는데 ${r.chroma === "clear" ? "선명한" : "부드러운"} 쪽이에요.`);

  if (r.subtype === "true") {
    lines.push(`밝기나 채도가 특별히 튀지 않고 ${r.season === "summer" || r.season === "winter" ? "쿨" : "웜"} 기운이 중심이라 세부 타입은 '트루'예요.`);
  } else {
    lines.push(`세 가지 중 ${SUBTYPE_REASON[r.subtype]}이 가장 두드러져서 세부 타입은 '${SUBTYPE_LABEL[r.subtype]}'예요.`);
  }

  lines.push(REFERENCE_REASON[r.reference ?? "none"]);

  if (r.confidence === "high") lines.push("모든 기준선에서 충분히 떨어져 있어서 확신도가 높아요.");
  else if (r.confidence === "mid") {
    const farEnough = hueDistance(r.undertone, r.hue) >= AXIS_MARGIN.hue && Math.abs(r.ita - ITA_LIGHT_MIN) >= AXIS_MARGIN.ita;
    lines.push(
      farEnough && !isFullyCorrected(r.reference ?? "none")
        ? "기준선에서는 떨어져 있지만 조명 보정이 완전하지 않아서 확신도는 보통까지만 줘요."
        : "일부 지표가 기준선에 가까워서 확신도는 보통이에요.",
    );
  } else lines.push("기준선에 걸쳐 있어서 조명이 바뀌면 결과가 달라질 수 있어요.");

  return lines;
}
