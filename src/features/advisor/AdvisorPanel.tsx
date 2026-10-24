"use client";

import { useRef, useState, type FormEvent } from "react";
import { BUTTON } from "@/components/styles";
import { chroma } from "@/features/analysis/color";
import { track } from "@/features/analytics/track";
import { SEASON_INFO } from "@/features/recommend/palettes";
import { SwatchSmear } from "@/features/swatch/SwatchSmear";
import { seedOf, smearFinish } from "@/features/swatch/smear";
import { useAnalysisStore } from "@/stores/analysisStore";
import type { Season } from "@/types/analysis";
import type { AdvisorEvent, ChatTurn, ProductCard } from "./agent";

const PRICE_LABEL: Record<ProductCard["priceTier"], string> = { under20k: "2만원 이하", "20k-40k": "2~4만원대", over40k: "4만원 이상" };

/** 시즌마다 처음 물어보기 좋은 질문 */
const STARTERS: Record<Season, string[]> = {
  spring: ["출근할 때 바를 립 골라 줘", "블러셔는 어떤 색이 좋아?", "피하면 좋은 색은?", "2만원 이하 코랄 립"],
  summer: ["출근할 때 바를 립 골라 줘", "블러셔는 어떤 색이 좋아?", "피하면 좋은 색은?", "2만원 이하 로즈 립"],
  autumn: ["출근할 때 바를 립 골라 줘", "블러셔는 어떤 색이 좋아?", "피하면 좋은 색은?", "2만원 이하 브릭 립"],
  winter: ["출근할 때 바를 립 골라 줘", "블러셔는 어떤 색이 좋아?", "피하면 좋은 색은?", "2만원 이하 레드 립"],
};

interface Message extends ChatTurn {
  products?: ProductCard[];
  /** 에이전트가 사진에 발라 본 제품 */
  applied?: ProductCard;
  mode?: "ai" | "search";
  /** 이 답에 대한 이용자 평가 */
  rated?: boolean;
}

interface AdvisorPanelProps {
  /** 발라 본 모습을 크게 보여 준다 */
  onPreview: () => void;
}

/**
 * 결과 화면 아래의 뷰티 상담. 진단 숫자와 질문만 서버로 보내고, 서버의 에이전트가 제품 DB·가이드를 찾아 답한다.
 * 답에 나온 제품은 바로 사진에 발라 볼 수 있다
 */
export function AdvisorPanel({ onPreview }: AdvisorPanelProps) {
  const result = useAnalysisStore((s) => s.result);
  const selectLip = useAnalysisStore((s) => s.selectLip);
  const selectBlush = useAnalysisStore((s) => s.selectBlush);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = status !== null;
  const endRef = useRef<HTMLDivElement>(null);

  if (!process.env.NEXT_PUBLIC_ADVISOR_ENABLED || !result) return null;

  const apply = (p: ProductCard) => {
    if (p.category === "lip") selectLip(p.id);
    else selectBlush(p.id);
  };

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    setError(null);
    setInput("");
    const history: Message[] = [...messages, { role: "user", text }];
    setMessages(history);
    setStatus("생각하는 중…");
    track({ name: "advisor-ask" });
    const reply: Message = { role: "assistant", text: "" };
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: { season: result.season, subtype: result.subtype, hue: result.hue, ita: result.ita, chroma: chroma(result.lab) },
          history: history.map(({ role, text: t }) => ({ role, text: t })).filter((m) => m.text),
        }),
      });
      if (res.status === 429) throw new Error("질문이 너무 빨라요. 잠깐 뒤에 다시 물어봐 주세요.");
      if (!res.ok || !res.body) throw new Error("지금은 상담을 할 수 없어요. 잠시 뒤에 다시 시도해 주세요.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const e = JSON.parse(line) as AdvisorEvent;
          if (e.type === "status") setStatus(e.text);
          else if (e.type === "products") reply.products = e.items;
          else if (e.type === "tryOn") {
            reply.applied = e.item;
            apply(e.item);
          } else if (e.type === "answer") {
            reply.text = e.text;
            reply.mode = e.mode;
          }
        }
      }
      setMessages([...history, reply]);
    } catch (e) {
      setMessages(history);
      setError(e instanceof Error ? e.message : "상담 중 문제가 생겼어요");
    } finally {
      setStatus(null);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    }
  };

  /** 답 하나에 "도움이 됐어요 / 아쉬워요". 질문·답 글은 보내지 않고 모드와 붙은 제품만 */
  const rate = async (index: number, helpful: boolean) => {
    const m = messages[index];
    if (!m || m.rated || !m.mode) return;
    setMessages((prev) => prev.map((x, j) => (j === index ? { ...x, rated: true } : x)));
    try {
      await fetch("/api/advisor/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpful, mode: m.mode, products: (m.products ?? []).map((p) => p.id).slice(0, 3) }),
      });
    } catch {
      // 평가는 놓쳐도 상담엔 지장이 없다
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void ask(input);
  };

  const info = SEASON_INFO[result.season];

  return (
    <section aria-labelledby="advisor-heading">
      <h3 id="advisor-heading" className="text-[20px] font-semibold">
        {info.label} {info.tone}에게 물어보세요
      </h3>
      <p className="mt-1 text-[13px] text-muted">제품 DB와 퍼스널 컬러 가이드를 찾아 답하고, 고른 색은 사진에 바로 발라 봐요. 진단 숫자와 질문만 보내고 사진은 보내지 않아요.</p>

      {messages.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {STARTERS[result.season].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void ask(q)}
              disabled={busy}
              className="inline-flex h-9 items-center rounded-[6px] border border-fg/20 px-3.5 text-[13px] transition-colors hover:border-fg disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <ol aria-live="polite" className="mt-4 space-y-4">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <li key={i} className="ml-auto w-fit max-w-[85%] rounded-[12px] bg-card px-3.5 py-2.5 text-[14px]">
                {m.text}
              </li>
            ) : (
              <li key={i} className="space-y-3 text-[14px] leading-relaxed">
                {m.applied && (
                  <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
                    <span aria-hidden="true" className="inline-block size-3 rounded-full" style={{ background: m.applied.hex }} />
                    {m.applied.label}을(를) 사진에 발라 봤어요
                    <button type="button" onClick={onPreview} className={BUTTON.text}>
                      크게 보기
                    </button>
                  </p>
                )}
                <p className="whitespace-pre-line">{m.text}</p>
                {m.products && (
                  <ul className="divide-y divide-line border-y border-line">
                    {m.products.map((p) => (
                      <li key={p.id} className="flex items-center gap-3.5 py-3">
                        <SwatchSmear color={p.hex} width={44} height={44} finish={smearFinish(p.finish)} seed={seedOf(p.id)} className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] text-muted">
                            {p.brand} · {PRICE_LABEL[p.priceTier]}
                          </p>
                          <p className="line-clamp-2 text-[14px] font-medium leading-snug">{p.shade}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              apply(p);
                              track({ name: "advisor-try-on" });
                              onPreview();
                            }}
                            className={`${BUTTON.small} border-fg bg-fg text-white hover:opacity-85`}
                          >
                            발라 보기
                          </button>
                          <a href={p.url} target="_blank" rel="sponsored noopener" className="text-[12px] text-muted underline underline-offset-2">
                            쿠팡에서 보기
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {m.mode === "search" && <p className="text-[12px] text-muted">AI 대신 검색으로 찾은 결과예요.</p>}
                {m.mode && (
                  <div className="flex items-center gap-1.5 text-[12px] text-muted">
                    {m.rated ? (
                      <span>평가 고마워요</span>
                    ) : (
                      <>
                        <span className="mr-1">이 답이</span>
                        {(
                          [
                            [true, "도움이 됐어요"],
                            [false, "아쉬워요"],
                          ] as const
                        ).map(([helpful, label]) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => void rate(i, helpful)}
                            className="inline-flex h-7 items-center rounded-[6px] border border-fg/20 px-2.5 text-[12px] text-fg hover:border-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
                          >
                            {label}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </li>
            ),
          )}
        </ol>
      )}

      {status && (
        <p role="status" className="mt-3 animate-pulse text-[13px] text-muted">
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-amber-900">
          {error}
        </p>
      )}
      <div ref={endRef} />

      <form onSubmit={submit} className="mt-4 flex items-center gap-2">
        <label htmlFor="advisor-input" className="sr-only">
          질문
        </label>
        <input
          id="advisor-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={400}
          enterKeyHint="send"
          placeholder={messages.length ? "더 물어보기" : "예: 데일리로 바를 차분한 립"}
          className="h-12 min-w-0 flex-1 rounded-[6px] border border-fg/20 bg-bg px-4 text-[16px] outline-none focus:border-fg"
        />
        <button type="submit" disabled={busy || !input.trim()} aria-label="보내기" className={`${BUTTON.primary} w-12 px-0`}>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 16V4M5 9l5-5 5 5" />
          </svg>
        </button>
      </form>
      {messages.length > 0 && <p className="mt-2 text-[11px] text-muted">제품 링크는 쿠팡 파트너스 제휴 링크예요. AI 답변은 틀릴 수 있어요.</p>}
    </section>
  );
}
