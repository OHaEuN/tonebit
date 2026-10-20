import { describe, expect, it } from "vitest";
import { depthRounds, drapeResult, pickedWarm, ROUNDS_PER_AXIS, undertoneRounds } from "./drape";

describe("셀프 드레이핑", () => {
  it("웜/쿨 라운드는 웜 색 하나, 쿨 색 하나이고 좌우를 번갈아 놓는다", () => {
    const rounds = undertoneRounds();
    expect(rounds).toHaveLength(ROUNDS_PER_AXIS);
    for (const r of rounds) expect(new Set(r.map((o) => o.side))).toEqual(new Set(["warm", "cool"]));
    expect(rounds[0][0].side).not.toBe(rounds[1][0].side);
  });

  it("라이트/딥 라운드는 고른 웜·쿨 안에서 묻는다", () => {
    for (const r of depthRounds(true)) expect(new Set(r.map((o) => o.side))).toEqual(new Set(["light", "deep"]));
    expect(depthRounds(true)[0].map((o) => o.swatch.id).join()).not.toBe(depthRounds(false)[0].map((o) => o.swatch.id).join());
  });

  it("다수결로 시즌을 낸다. 덜 골랐으면 null", () => {
    expect(drapeResult(["warm", "cool", "warm", "light", "light", "deep"], "winter")).toEqual({ season: "spring", undecided: [] });
    expect(drapeResult(["cool", "cool", "warm", "deep", "deep", "light"], "spring")).toEqual({ season: "winter", undecided: [] });
    expect(drapeResult(["warm", "warm"], "spring")).toBeNull();
  });

  it("비슷해요로 비긴 축은 측정 결과를 따른다", () => {
    expect(drapeResult(["warm", "cool", "same", "light", "light", "same"], "autumn")).toEqual({ season: "spring", undecided: ["undertone"] });
    expect(drapeResult(["same", "same", "same", "same", "same", "same"], "winter")).toEqual({ season: "winter", undecided: ["undertone", "depth"] });
    expect(pickedWarm(["same", "warm", "cool"], "summer")).toBe(false);
  });
});
