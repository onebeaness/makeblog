"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatResponse, Source } from "@/lib/rag/types";

type Message =
  | { role: "user"; text: string }
  | { role: "bot"; text: string; sources: Source[] }
  | { role: "error"; text: string };

const EXAMPLES = ["운동할 때 써도 되나요?", "배터리 몇 시간이나 가요?", "통화 품질은 어떤가요?"];

/** 별점을 색 없이 표시한다. 채운 원과 빈 원. */
function Stars({ rating }: { rating: number }) {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="font-mono" aria-label={`별점 ${n}점`}>
      {"●".repeat(n)}
      {"○".repeat(5 - n)}
    </span>
  );
}

/** 스피너 없음. 점 3개 깜빡임. */
function Dots() {
  return (
    <span className="inline-flex gap-1" role="status" aria-label="답변 생성 중">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="dot h-1.5 w-1.5 rounded-full bg-ink-faint"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}

function SourceList({ sources, defaultOpen = false }: { sources: Source[]; defaultOpen?: boolean }) {
  if (sources.length === 0) return null;
  return (
    <details open={defaultOpen} className="mt-4 border-t border-rule pt-3">
      <summary className="cursor-pointer font-mono text-xs text-ink-faint">
        참고한 리뷰 {sources.length}건
      </summary>
      <ul className="mt-3 space-y-2.5">
        {sources.map((s) => (
          <li key={s.id} className="text-sm">
            <span className="font-mono text-xs text-ink-faint">
              {s.id} <Stars rating={s.rating} />{" "}
              {/* 유사도 점수. 검색이 왜 이걸 골랐는지 보이게 그대로 노출한다. */}
              <span title="유사도 점수">{s.score.toFixed(2)}</span>
            </span>
            <span className="mt-0.5 block text-ink-soft">{s.content}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function ChatClient({
  missingEnv,
  embeddingLabel,
  llmLabel,
}: {
  missingEnv: string[];
  embeddingLabel: string;
  llmLabel: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [indexing, setIndexing] = useState<string | null>(null);
  /**
   * 명세 08절 3단계를 상시 기능으로 남겨둔 것.
   * 켜면 LLM 을 부르지 않고 검색 결과만 보여준다. 답이 이상할 때
   * 검색 탓인지 LLM 탓인지 여기서 가른다.
   */
  const [retrieveOnly, setRetrieveOnly] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  const configured = missingEnv.length === 0;

  async function ask(question: string) {
    if (!question.trim() || pending) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setPending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, retrieveOnly }),
      });
      const data = (await res.json()) as ChatResponse & { error?: string };
      setMessages((m) =>
        res.ok && !data.error
          ? [...m, { role: "bot", text: data.answer, sources: data.sources ?? [] }]
          : [...m, { role: "error", text: data.error ?? "답변을 가져오지 못했습니다." }],
      );
    } catch (error) {
      setMessages((m) => [
        ...m,
        { role: "error", text: error instanceof Error ? error.message : "요청에 실패했습니다." },
      ]);
    } finally {
      setPending(false);
    }
  }

  async function runIndexing() {
    if (indexing) return;
    setIndexing("인덱싱 중… 100건을 벡터로 바꾸는 중입니다.");
    try {
      const res = await fetch("/api/index", { method: "POST" });
      const data = (await res.json()) as {
        indexed?: number;
        namespace?: string;
        model?: string;
        error?: string;
      };
      setIndexing(
        res.ok && !data.error
          ? `완료 — ${data.indexed}건 · 네임스페이스 ${data.namespace} · ${data.model}`
          : `실패 — ${data.error}`,
      );
    } catch (error) {
      setIndexing(`실패 — ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <style>{`
        @keyframes blinkdot { 0%, 80%, 100% { opacity: .2 } 40% { opacity: 1 } }
        .dot { animation: blinkdot 1.2s infinite ease-in-out; }
        @media (prefers-reduced-motion: reduce) { .dot { animation: none; opacity: .6 } }
      `}</style>

      {/* 헤더 */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 border-b border-rule pb-4">
        <h1 className="text-xl font-black tracking-tight text-ink">리뷰 챗봇</h1>
        <span className="text-sm text-ink-faint">프리미엄 무선 이어폰 Pro</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={runIndexing}
          disabled={!configured || indexing !== null}
          className="border border-rule-firm px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
        >
          샘플 인덱싱
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-mono text-xs text-ink-faint">
          임베딩 {embeddingLabel} · LLM {retrieveOnly ? "사용 안 함" : llmLabel}
        </p>
        <div className="flex-1" />
        <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-ink-soft">
          <input
            type="checkbox"
            checked={retrieveOnly}
            onChange={(e) => setRetrieveOnly(e.target.checked)}
            className="accent-ink"
          />
          검색만 보기 (LLM 없이)
        </label>
      </div>

      {!configured && (
        <div className="border-l-[3px] border-ink bg-surface p-5">
          <p className="mb-2 font-mono text-[11px] font-bold tracking-[0.08em] text-ink uppercase">
            Setup required
          </p>
          <p className="text-sm text-ink-soft">
            서버 전용 환경 변수가 없습니다:{" "}
            <code className="bg-surface-2 px-1 py-0.5 font-mono text-ink">
              {missingEnv.join(", ")}
            </code>
            . 이 값들은 <strong className="text-ink">NEXT_PUBLIC_ 접두사를 붙이면 안 됩니다</strong> —
            브라우저로 나가는 순간 남이 내 크레딧을 씁니다.
          </p>
        </div>
      )}

      {indexing && (
        <p className="border border-rule bg-surface px-4 py-3 font-mono text-xs text-ink-soft">
          {indexing}
        </p>
      )}

      {/* 대화 */}
      <div className="flex min-h-40 flex-col gap-5">
        {messages.length === 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-faint">리뷰 100건을 근거로 답합니다. 예를 들어 —</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => ask(q)}
                  disabled={!configured}
                  className="border border-rule px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] bg-invert-bg px-4 py-2.5 text-sm text-invert-ink">
                {m.text}
              </p>
            </div>
          ) : m.role === "bot" ? (
            <div key={i} className="border border-rule-firm px-4 py-3.5">
              {m.text ? (
                <p className="text-[15px] whitespace-pre-wrap text-ink-soft">{m.text}</p>
              ) : (
                <p className="font-mono text-xs text-ink-faint">
                  검색 결과만 표시합니다 — LLM 을 부르지 않았습니다.
                </p>
              )}
              <SourceList sources={m.sources} defaultOpen={!m.text} />
            </div>
          ) : (
            <p
              key={i}
              role="alert"
              className="border-l-[3px] border-ink bg-surface px-4 py-3 text-sm text-ink-soft"
            >
              {m.text}
            </p>
          ),
        )}

        {pending && (
          <div className="border border-rule px-4 py-3.5">
            <Dots />
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* 입력 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="sticky bottom-4 flex gap-2 bg-bg pt-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="질문을 입력하세요…"
          aria-label="질문"
          maxLength={500}
          disabled={!configured}
          className="flex-1 border border-rule-firm bg-bg px-4 py-3 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!configured || pending || !input.trim()}
          className="bg-invert-bg px-5 py-3 text-sm font-bold text-invert-ink transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          전송
        </button>
      </form>
    </div>
  );
}
