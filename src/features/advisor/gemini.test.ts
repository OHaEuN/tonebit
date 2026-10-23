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
  beforeEach(() => vi.stubEnv("GEMINI_API_KEY", "test"));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("내려갔거나(404) 붐비면(503) 다음 모델로 넘어가고, 응답한 모델에 붙는다", async () => {
    const calls = stubModels({ old: () => fail(404), busy: () => fail(503), good: () => ok("안녕") });
    const chat = geminiChat(["old", "busy", "good"]);
    expect((await chat.generate(REQ)).parts[0].text).toBe("안녕");
    expect(chat.model()).toBe("good");
    await chat.generate(REQ);
    expect(calls).toEqual(["old", "busy", "good", "good"]);
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
    const calls = stubModels({ a: () => fail(400), b: () => ok("x") });
    await expect(geminiChat(["a", "b"]).generate(REQ)).rejects.toThrow("Gemini 400");
    expect(calls).toEqual(["a"]);
  });
});
