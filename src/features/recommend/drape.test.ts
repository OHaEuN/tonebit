import { describe, expect, it } from "vitest";
import { depthRounds, drapeSeason, ROUNDS_PER_AXIS, undertoneRounds } from "./drape";

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
    expect(drapeSeason(["warm", "cool", "warm", "light", "light", "deep"])).toBe("spring");
    expect(drapeSeason(["cool", "cool", "warm", "deep", "deep", "light"])).toBe("winter");
    expect(drapeSeason(["warm", "warm"])).toBeNull();
  });
});
