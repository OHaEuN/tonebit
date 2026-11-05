import { beforeEach, describe, expect, it } from "vitest";
import { useAnalysisStore } from "./analysisStore";

const skin = (b: number) => ({ lab: { L: 65, a: 12, b }, corrected: false });

beforeEach(() => useAnalysisStore.getState().reset());

describe("addShots", () => {
  it("여러 장을 한 번에 더하면 결과 화면으로 한 번만 넘어가고 모두 합친 결과를 보여 준다", () => {
    const s = useAnalysisStore.getState();
    s.begin("image");
    s.startMeasuring();
    const ids = s.addShots([skin(18), skin(22)]);
    const after = useAnalysisStore.getState();
    expect(ids).toHaveLength(2);
    expect(after.stage).toBe("done");
    expect(after.shots.map((x) => x.id)).toEqual(ids);
    expect(after.view).toBeNull();
    expect(after.result).toEqual(after.combined);
  });

  it("더한 게 없으면 결과가 없을 땐 측정 전으로, 있을 땐 결과 화면으로 돌아간다", () => {
    const s = useAnalysisStore.getState();
    s.begin("image");
    s.startMeasuring();
    expect(s.addShots([])).toEqual([]);
    expect(useAnalysisStore.getState().stage).toBe("live");
    useAnalysisStore.getState().addShots([skin(18)]);
    useAnalysisStore.getState().startMeasuring();
    useAnalysisStore.getState().addShots([]);
    expect(useAnalysisStore.getState().stage).toBe("done");
    expect(useAnalysisStore.getState().shots).toHaveLength(1);
  });
});
