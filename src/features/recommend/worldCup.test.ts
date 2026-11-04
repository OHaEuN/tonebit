import { describe, expect, it } from "vitest";
import { champion, currentMatch, matchLabel, pickContenders, pickWinner, progress, shuffle, startBracket } from "./worldCup";

describe("립 월드컵 대진", () => {
  it("16명이 붙으면 15번 골라 우승자가 나오고 라운드 이름이 바뀐다", () => {
    const ids = Array.from({ length: 16 }, (_, i) => `p${i}`);
    let b = startBracket(ids);
    expect(matchLabel(b)).toBe("16강 1/8");
    const seen: string[] = [];
    for (let i = 0; i < 15; i++) {
      const m = currentMatch(b);
      expect(m).not.toBeNull();
      seen.push(matchLabel(b));
      b = pickWinner(b, m![0]);
    }
    expect(champion(b)).toBe("p0");
    expect(seen).toContain("8강 1/4");
    expect(seen).toContain("준결승 2/2");
    expect(seen.at(-1)).toBe("결승");
    expect(progress(b, 16)).toBe(1);
  });

  it("홀수 인원이면 남은 하나는 부전승으로 올라간다", () => {
    let b = startBracket(["a", "b", "c"]);
    b = pickWinner(b, "b");
    expect(b.queue).toEqual(["b", "c"]);
    b = pickWinner(b, "c");
    expect(champion(b)).toBe("c");
  });

  it("후보는 색이 서로 다른 것부터 고르고 모자라면 상위로 채운다", () => {
    const ranked = [
      { id: 1, hex: "#C0392B" },
      { id: 2, hex: "#C1392C" },
      { id: 3, hex: "#E59866" },
      { id: 4, hex: "#8E44AD" },
    ];
    expect(pickContenders(ranked, 3).map((p) => p.id)).toEqual([1, 3, 4]);
    expect(pickContenders(ranked, 4).map((p) => p.id)).toEqual([1, 3, 4, 2]);
  });

  it("섞어도 같은 원소가 모두 남는다", () => {
    const ids = ["a", "b", "c", "d", "e"];
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    expect([...shuffle(ids, random)].sort()).toEqual(ids);
  });
});
