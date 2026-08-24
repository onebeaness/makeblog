import { StringOutputParser } from "@langchain/core/output_parsers";
import { createEmbedder } from "./embeddings";
import { searchSimilar } from "./pinecone";
import { createLlm } from "./llm";
import { RAG_PROMPT, formatContext } from "./prompt";
import { ragConfig } from "./config";
import type { ChatResponse, Source } from "./types";

/**
 * 랭체인 5단계 중 5단계 Retrievers.
 * 질문을 벡터로 바꿔 가까운 리뷰 topK 건을 회수한다.
 *
 * 여기가 이 프로젝트의 심장이다. 검색이 놓친 정보는 LLM 이 절대 복구하지
 * 못한다. 답변이 부실할 때 프롬프트부터 고치는 것은 대개 잘못된 순서다.
 */
export type RetrieveResult = { sources: Source[]; namespace: string; model: string };

export async function retrieve(
  question: string,
  topK = ragConfig.topK,
): Promise<RetrieveResult> {
  const embedder = createEmbedder();
  const vector = await embedder.embedQuery(question);
  const sources = await searchSimilar(embedder.namespace, vector, topK);
  return { sources, namespace: embedder.namespace, model: embedder.model };
}

/**
 * LCEL — 유닉스 파이프와 같은 발상이다.
 *
 *   Prompt | Model | OutputParser
 *   (리뷰를 템플릿에 끼우고) → (LLM 에 보내고) → (텍스트만 뽑는다)
 */
const chain = () => RAG_PROMPT.pipe(createLlm()).pipe(new StringOutputParser());

/** 검색 → 답변 생성. 근거가 없으면 LLM 을 부르지 않는다. */
export async function answerQuestion(question: string): Promise<ChatResponse> {
  const { sources } = await retrieve(question);

  // 검색이 아무것도 못 찾았으면 LLM 을 부를 이유가 없다.
  // 부르면 근거 없이 지어낼 뿐이고, 요금만 나간다.
  if (sources.length === 0) {
    return { answer: "리뷰에서 관련 내용을 찾지 못했습니다.", sources: [] };
  }

  const answer = await chain().invoke({
    context: formatContext(sources),
    question,
  });

  return { answer: answer.trim(), sources };
}
