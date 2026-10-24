import { beforeEach, describe, expect, it, vi } from "vitest";

const shade = { id: "mine-abc", name: "내 립", hex: "#c0392b", category: "lip" };

function stubStorage(init: Record<string, string>) {
  const data = new Map(Object.entries(init));
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  });
  return data;
}

describe("내 색 저장소", () => {
  beforeEach(() => vi.resetModules());

  it("이름을 바꾸기 전 키에 남은 색을 새 키로 옮긴다", async () => {
    const data = stubStorage({ "tonepick:my-shades": JSON.stringify([shade]) });
    const { useMyShadeStore } = await import("./store");
    useMyShadeStore.getState().hydrate();
    expect(useMyShadeStore.getState().shades).toEqual([shade]);
    expect(data.get("tonebit:my-shades")).toBe(JSON.stringify([shade]));
    expect(data.has("tonepick:my-shades")).toBe(false);
  });

  it("새 키가 있으면 예전 키는 건드리지 않는다", async () => {
    const data = stubStorage({ "tonebit:my-shades": "[]", "tonepick:my-shades": JSON.stringify([shade]) });
    const { useMyShadeStore } = await import("./store");
    useMyShadeStore.getState().hydrate();
    expect(useMyShadeStore.getState().shades).toEqual([]);
    expect(data.has("tonepick:my-shades")).toBe(true);
  });
});
