import { describe, expect, it } from "vitest";
import { diversifyByLine, type LipCandidate } from "./useLipRanking";

const row = (id: string, brand: string, line: string, shade: string, kind: LipCandidate["kind"] = "product") => ({
  item: { id, name: `${brand} ${line} ${shade}`, brand, shade: `${line} ${shade}`, line, hex: "#C8283E", seasons: [], kind } as LipCandidate,
});

describe("diversifyByLine", () => {
  it("같은 라인은 두 개까지만 남기고 순서는 지킨다", () => {
    const rows = [row("a", "롬앤", "더 쥬시 래스팅 틴트", "07 체리 밤"), row("b", "롬앤", "더 쥬시 래스팅 틴트", "21 그레이프 밤"), row("c", "롬앤", "더 쥬시 래스팅 틴트", "22 도토리 밤"), row("d", "힌스", "로 글로우 젤 틴트", "02 로 로즈"), row("e", "롬앤", "글래스팅 멜팅 밤", "06 카야 피그")];
    expect(diversifyByLine(rows).map((r) => r.item.id)).toEqual(["a", "b", "d", "e"]);
  });
  it("팔레트 색과 내 제품은 거르지 않는다", () => {
    const rows = [row("p1", "", "", "로즈", "palette"), row("p2", "", "", "모브", "palette"), row("p3", "", "", "핑크", "palette")];
    expect(diversifyByLine(rows)).toHaveLength(3);
  });
});
