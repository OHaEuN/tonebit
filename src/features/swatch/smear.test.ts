import { describe, expect, it } from "vitest";
import { hexToRgb } from "@/features/analysis/color";
import { renderSmear, seedOf, smearFinish } from "./smear";

describe("renderSmear", () => {
  const opts = { width: 80, height: 80, color: "#C8283E", shape: "dab", finish: "cream", seed: 3 } as const;

  it("같은 seed면 같은 그림", () => {
    expect(renderSmear(opts).data).toEqual(renderSmear(opts).data);
    expect(renderSmear({ ...opts, seed: 4 }).data).not.toEqual(renderSmear(opts).data);
  });

  it("모서리는 투명하고 가운데는 원래 색에 가깝다", () => {
    const { data, width } = renderSmear(opts);
    expect(data[3]).toBe(0);
    const c = (40 * width + 40) * 4;
    expect(data[c + 3]).toBe(255);
    const [r, g, b] = hexToRgb(opts.color);
    expect(Math.abs(data[c] - r) + Math.abs(data[c + 1] - g) + Math.abs(data[c + 2] - b)).toBeLessThan(60);
  });

  it("손등에 바른 자국은 오른쪽으로 꼬리가 흩어진다", () => {
    const { data, width, height } = renderSmear({ ...opts, width: 300, height: 120, shape: "swipe" });
    const covered = (x0: number, x1: number) => {
      let n = 0;
      for (let y = 0; y < height; y++) for (let x = x0; x < x1; x++) if (data[(y * width + x) * 4 + 3] > 0) n++;
      return n;
    };
    expect(covered(0, 150)).toBeGreaterThan(covered(225, 300) * 3);
    expect(covered(225, 300)).toBeGreaterThan(0);
  });
});

describe("도우미", () => {
  it("제형별 광택과 id별 seed", () => {
    expect(smearFinish("glossy")).toBe("gloss");
    expect(smearFinish("velvet")).toBe("matte");
    expect(smearFinish(undefined)).toBe("cream");
    expect(seedOf("a")).toBe(seedOf("a"));
    expect(seedOf("a")).not.toBe(seedOf("b"));
  });
});
