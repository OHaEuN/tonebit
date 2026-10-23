import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { geminiChat, QuotaError } from "./gemini";

const REQ = { system: "s", contents: [{ role: "user" as const, parts: [{ text: "hi" }] }], tools: [] };
const ok = (text: string) => new Response(JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text }] } }] }), { status: 200 });
const fail = (status: number) => new Response(JSON.stringify({ error: { code: status } }), { status });

/** URL의 모델 이름별로 정한 응답을 돌려주는 가짜 fetch */
function stubModels(plan: Record<string, () => Response>) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const model = /models\/([^:]+):/.exec(url)![1];
      calls.push(model);
      return plan[model]();
    }),
  );
  return calls;
}

describe("geminiChat", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test");
    vi.stubEnv("GEMINI_RETRY_MS", "0");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("내려갔거나(404) 계속 붐비면(503, 한 번 다시 시도) 다음 모델로 넘어가고, 응답한 모델에 붙는다", async () => {
    const calls = stubModels({ old: () => fail(404), busy: () => fail(503), good: () => ok("안녕") });
    const chat = geminiChat(["old", "busy", "good"]);
    expect((await chat.generate(REQ)).parts[0].text).toBe("안녕");
    expect(chat.model()).toBe("good");
    await chat.generate(REQ);
    expect(calls).toEqual(["old", "busy", "busy", "good", "good"]);
  });

  it("404를 받은 모델은 다음 대화에서 건너뛴다", async () => {
    const calls = stubModels({ gone: () => fail(404), next: () => ok("네") });
    await geminiChat(["gone", "next"]).generate(REQ);
    await geminiChat(["gone", "next"]).generate(REQ);
    expect(calls).toEqual(["gone", "next", "next"]);
  });

  it("모든 모델이 한도 초과면 QuotaError", async () => {
    stubModels({ a: () => fail(429), b: () => fail(429) });
    await expect(geminiChat(["a", "b"]).generate(REQ)).rejects.toBeInstanceOf(QuotaError);
  });

  it("잘못된 요청(400)은 다른 모델로 넘기지 않고 바로 실패한다", async () => {
    // 모델 막힘 상태는 모듈 전체에서 공유되므로 앞 테스트와 다른 이름을 쓴다
    const calls = stubModels({ bad: () => fail(400), fine: () => ok("x") });
    await expect(geminiChat(["bad", "fine"]).generate(REQ)).rejects.toThrow("Gemini 400");
    expect(calls).toEqual(["bad"]);
  });
});

describe("무료 한도·붐빔", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test");
    vi.stubEnv("GEMINI_RETRY_MS", "0");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  const quota = (seconds: number) =>
    new Response(JSON.stringify({ error: { code: 429, details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: `${seconds}s` }] } }), { status: 429 });

  it("429의 retryDelay를 읽는다", async () => {
    const { retryDelayMs } = await import("./gemini");
    expect(retryDelayMs('{"retryDelay": "11554s"}')).toBe(11_554_000);
    expect(retryDelayMs("{}")).toBeUndefined();
  });

  it("하루 한도를 다 쓴 모델은 알려 준 때까지 건너뛴다", async () => {
    const calls = stubModels({ daily: () => quota(3600), lite: () => ok("네") });
    await geminiChat(["daily", "lite"]).generate(REQ);
    await geminiChat(["daily", "lite"]).generate(REQ);
    expect(calls).toEqual(["daily", "lite", "lite"]);
  });

  it("붐빔(503)은 한 번 다시 시도한다", async () => {
    let n = 0;
    const calls = stubModels({ busy: () => (n++ === 0 ? fail(503) : ok("됐어요")) });
    expect((await geminiChat(["busy"]).generate(REQ)).parts[0].text).toBe("됐어요");
    expect(calls).toEqual(["busy", "busy"]);
  });

  it("붙은 모델이 대화 중간에 한도에 걸리면 오류를 던지고 그 모델을 막아 둔다", async () => {
    let n = 0;
    stubModels({ mid: () => (n++ === 0 ? ok("첫 답") : quota(60)), other: () => ok("다른 모델") });
    const chat = geminiChat(["mid", "other"]);
    await chat.generate(REQ);
    await expect(chat.generate(REQ)).rejects.toBeInstanceOf(QuotaError);
    expect(chat.calls()).toBe(2);
    const next = geminiChat(["mid", "other"]);
    expect((await next.generate(REQ)).parts[0].text).toBe("다른 모델");
  });
});
