/**
 * Gemini REST API를 SDK 없이 fetch로 부른다. 무료 등급(Flash·임베딩)으로 돈다.
 * 모델은 예고 없이 내려가고(2026-10: gemini-2.5-flash가 새 키에 404) 무료 등급은 자주 붐벼서(503),
 * 앞에서부터 차례로 시도하는 목록으로 둔다. GEMINI_MODEL에 쉼표로 바꿀 수 있다
 */
const BASE = () => process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta";
export const CHAT_MODELS = (process.env.GEMINI_MODEL ?? "gemini-3.8-flash,gemini-flash-latest,gemini-flash-lite-latest")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
export const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-001";
/** pgvector 컬럼 차원과 같아야 한다. gemini-embedding-001은 3072를 줄여 쓸 수 있다(MRL) */
export const EMBED_DIM = 768;

export function geminiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export interface Part {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
  /** 생각하는 모델이 붙이는 서명. 함수 호출 다음 턴에 그대로 돌려줘야 한다 */
  thoughtSignature?: string;
  thought?: boolean;
}

export interface Content {
  role: "user" | "model";
  parts: Part[];
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface GenerateRequest {
  system: string;
  contents: Content[];
  tools: FunctionDeclaration[];
}

/** 에이전트가 쓰는 모델 인터페이스. 테스트에선 각본대로 답하는 가짜로 바꾼다 */
export interface ChatModel {
  generate(req: GenerateRequest): Promise<Content>;
}

export type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export interface Embedder {
  embed(texts: string[], task: TaskType): Promise<number[][]>;
}

export class GeminiError extends Error {
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(`Gemini ${status}: ${detail.slice(0, 300)}`);
  }
}

export class QuotaError extends GeminiError {
  constructor(
    detail: string,
    /** 구글이 알려 준 다시 시도할 수 있는 때까지(ms). 무료 등급 하루 한도면 몇 시간 */
    readonly retryAfterMs = 60_000,
  ) {
    super(429, detail);
  }
}

/** 429 응답의 RetryInfo.retryDelay("11554s")를 ms로 */
export function retryDelayMs(body: string): number | undefined {
  const m = /"retryDelay":\s*"(\d+(?:\.\d+)?)s"/.exec(body);
  return m ? Math.ceil(Number(m[1]) * 1000) : undefined;
}

async function call(path: string, body: unknown): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY가 없어요");
  const res = await fetch(`${BASE()}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  });
  if (res.status === 429) {
    const text = await res.text();
    throw new QuotaError(`무료 한도 초과 ${text.slice(0, 200)}`, retryDelayMs(text));
  }
  if (!res.ok) throw new GeminiError(res.status, await res.text());
  return res.json();
}

/**
 * 이 서버 인스턴스에서 쓰지 말아야 할 모델과 그 기한. 내려간 모델(404)은 영영, 한도를 다 쓴 모델(429)은 구글이 알려 준 때까지.
 * 무료 등급은 모델마다 하루 요청 수가 작아서(2026-10 gemini-3.8-flash 하루 20회) 한 번 막히면 몇 시간 그대로다
 */
const unavailableUntil = new Map<string, number>();

export function markUnavailable(model: string, e: unknown, now = Date.now()) {
  if (e instanceof QuotaError) unavailableUntil.set(model, now + e.retryAfterMs);
  else if (e instanceof GeminiError && e.status === 404) unavailableUntil.set(model, Infinity);
}

export const isAvailable = (model: string, now = Date.now()) => (unavailableUntil.get(model) ?? 0) <= now;

/** 다음 모델로 넘어갈 만한 실패: 내려감(404), 한도(429), 붐빔·장애(5xx), 시간 초과 */
export const switchable = (e: unknown) =>
  e instanceof GeminiError ? e.status === 404 || e.status === 429 || e.status >= 500 : e instanceof Error && e.name === "TimeoutError";

/** 768차원으로 줄인 임베딩은 정규화가 안 돼 있어 코사인 거리를 쓰기 전에 단위 벡터로 맞춘다 */
function normalize(v: number[]): number[] {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

/** 붐빔(5xx)은 잠깐이면 풀릴 때가 많아 한 번만 1초 뒤 다시 시도한다 */
async function generateWith(model: string, req: GenerateRequest, retry = true): Promise<Content> {
  try {
    return await generateOnce(model, req);
  } catch (e) {
    if (!retry || !(e instanceof GeminiError) || e.status < 500) throw e;
    await new Promise((r) => setTimeout(r, Number(process.env.GEMINI_RETRY_MS ?? 1000)));
    return generateWith(model, req, false);
  }
}

async function generateOnce(model: string, { system, contents, tools }: GenerateRequest): Promise<Content> {
  const data = (await call(`models/${model}:generateContent`, {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    tools: tools.length ? [{ functionDeclarations: tools }] : undefined,
    generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
  })) as { candidates?: { content?: Content }[] };
  const content = data.candidates?.[0]?.content;
  if (!content?.parts?.length) throw new Error("Gemini 응답이 비었어요");
  return { role: "model", parts: content.parts };
}

/**
 * 대화 한 번(에이전트 루프 한 번)에 쓸 모델. 처음 응답한 모델에 붙어서 끝까지 그 모델로 간다.
 * 함수 호출 다음 턴에 돌려주는 생각 서명은 모델마다 달라서 중간에 바꾸면 거절될 수 있다.
 * 처음 응답 전에는 내려갔거나(404) 붐비거나(5xx) 한도(429)면 다음 모델로 넘어간다.
 * 붙은 모델이 중간에 막히면 그 오류를 그대로 던지고, 라우트가 남은 모델로 대화를 처음부터 다시 돌린다
 */
export function geminiChat(models: string[] = CHAT_MODELS): ChatModel & { model: () => string | null; calls: () => number } {
  let pinned: string | null = null;
  let calls = 0;
  return {
    model: () => pinned,
    calls: () => calls,
    async generate(req) {
      if (pinned) {
        calls++;
        try {
          return await generateWith(pinned, req);
        } catch (e) {
          markUnavailable(pinned, e);
          throw e;
        }
      }
      const candidates = models.filter((m) => isAvailable(m));
      let last: unknown = new QuotaError("쓸 수 있는 Gemini 모델이 없어요(모두 한도 초과이거나 내려감)");
      let allQuota = true;
      for (const m of candidates) {
        calls++;
        try {
          const reply = await generateWith(m, req);
          pinned = m;
          return reply;
        } catch (e) {
          if (!switchable(e)) throw e;
          markUnavailable(m, e);
          if (!(e instanceof QuotaError)) allQuota = false;
          last = e;
        }
      }
      throw allQuota && !(last instanceof QuotaError) ? new QuotaError("모든 모델이 무료 한도 초과") : last;
    },
  };
}

export const gemini: Embedder = {
  async embed(texts, task) {
    const data = (await call(`models/${EMBED_MODEL}:batchEmbedContents`, {
      requests: texts.map((text) => ({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text }] },
        taskType: task,
        outputDimensionality: EMBED_DIM,
      })),
    })) as { embeddings: { values: number[] }[] };
    return data.embeddings.map((e) => normalize(e.values));
  },
};
