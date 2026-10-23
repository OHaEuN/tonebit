/**
 * 통합 e2e용 가짜 Gemini API. 실제 키 없이 서버의 에이전트 루프 전체(함수 호출 → DB 검색 → 화면 동작)를 돌린다.
 * - batchEmbedContents: 낱말 주머니 해시 임베딩(겹치는 낱말이 많을수록 가깝다)
 * - generateContent: 질문 → search_products, 검색 결과 → show_products + try_on, 그다음 → 답 글
 * 사용: node e2e/mock-gemini.mjs (포트 3999)
 */
import { createServer } from "node:http";

const DIM = 768;
function bagOfWords(text) {
  const v = new Array(DIM).fill(0);
  for (const w of text.split(/[\s,.·]+/).filter(Boolean)) {
    let h = 0;
    for (const ch of w) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    v[h % DIM] += 1;
  }
  return v;
}

const reply = (parts) => ({ candidates: [{ content: { role: "model", parts } }] });

createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const json = JSON.parse(body || "{}");
    res.setHeader("content-type", "application/json");
    if (req.url.includes(":batchEmbedContents")) {
      return res.end(JSON.stringify({ embeddings: json.requests.map((r) => ({ values: bagOfWords(r.content.parts[0].text) })) }));
    }
    const last = json.contents.at(-1).parts[0];
    if (last.text) {
      const category = /블러셔/.test(last.text) ? "blush" : "lip";
      return res.end(JSON.stringify(reply([{ functionCall: { name: "search_products", args: { query: last.text, category } } }])));
    }
    const fr = last.functionResponse;
    if (fr.name === "search_products") {
      const ids = fr.response.results.slice(0, 3).map((r) => r.id);
      return res.end(JSON.stringify(reply([{ functionCall: { name: "show_products", args: { ids } } }, { functionCall: { name: "try_on", args: { id: ids[0] } } }])));
    }
    return res.end(JSON.stringify(reply([{ text: "내 팔레트와 가까운 색으로 골라 봤어요. 첫 번째 색을 사진에 발라 뒀어요." }])));
  });
}).listen(3999, () => console.log("mock gemini :3999"));
