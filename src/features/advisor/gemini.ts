/**
 * Gemini REST API를 SDK 없이 fetch로 부른다. 무료 등급(Flash·임베딩)으로 돈다.
 * 모델 이름은 자주 바뀌어서 환경 변수로 바꿀 수 있게 했다
 */
const BASE = process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta";
export const CHAT_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
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

export class QuotaError extends Error {}

async function call(path: string, body: unknown): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY가 없어요");
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  });
  if (res.status === 429) throw new QuotaError("Gemini 무료 한도 초과");
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

/** 768차원으로 줄인 임베딩은 정규화가 안 돼 있어 코사인 거리를 쓰기 전에 단위 벡터로 맞춘다 */
function normalize(v: number[]): number[] {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

export const gemini: ChatModel & Embedder = {
  async generate({ system, contents, tools }) {
    const data = (await call(`models/${CHAT_MODEL}:generateContent`, {
      systemInstruction: { parts: [{ text: system }] },
      contents,
      tools: tools.length ? [{ functionDeclarations: tools }] : undefined,
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    })) as { candidates?: { content?: Content }[] };
    const content = data.candidates?.[0]?.content;
    if (!content?.parts?.length) throw new Error("Gemini 응답이 비었어요");
    return { role: "model", parts: content.parts };
  },

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
