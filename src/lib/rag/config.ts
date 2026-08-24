import type { Review } from "./types";

/**
 * RAG 설정. 전부 서버 전용 환경 변수다 — NEXT_PUBLIC_ 접두사가 하나도 없다.
 *
 * 이게 이 프로젝트가 챕터 09 와 갈리는 지점이다. 블로그의 anon key 는
 * RLS 가 지켜주므로 브라우저에 나가도 됐다. 그런데 Pinecone·Anthropic 키는
 * 지켜줄 RLS 가 없다. 노출되면 남이 내 크레딧을 쓴다.
 * 그래서 이 값들을 만지는 코드는 전부 API Route(서버) 안에만 있어야 한다.
 */

export type EmbeddingProvider = "pinecone" | "ollama";
export type LlmProvider = "anthropic" | "xai";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export const ragConfig = {
  embeddingProvider: (env("EMBEDDING_PROVIDER") ?? "pinecone") as EmbeddingProvider,

  // Pinecone 내장 임베딩 — GPU 도 설치도 필요 없다. 배포 환경에서 쓰는 쪽.
  pineconeEmbeddingModel: env("PINECONE_EMBEDDING_MODEL") ?? "llama-text-embed-v2",

  // Ollama 로컬 임베딩 — 03절 모델 비교는 이쪽에서 한다.
  // 주의: 배포된 서버에서 localhost 는 "그 서버 자신"이지 당신 PC 가 아니다.
  ollamaBaseUrl: env("OLLAMA_BASE_URL") ?? "http://127.0.0.1:11434",
  ollamaEmbeddingModel: env("OLLAMA_EMBEDDING_MODEL") ?? "qwen3-embedding:0.6b",

  pineconeApiKey: env("PINECONE_API_KEY"),
  pineconeIndex: env("PINECONE_INDEX") ?? "review-chatbot",
  /**
   * 네임스페이스. 인덱스 하나를 나눠 여러 임베딩 모델을 동시에 담는다.
   * 지정하지 않으면 임베딩 모델 이름에서 자동으로 만든다 —
   * 모델을 바꿨는데 네임스페이스를 안 바꾸면 좌표계가 섞여 검색이 망가진다.
   */
  pineconeNamespace: env("PINECONE_NAMESPACE"),

  llmProvider: (env("LLM_PROVIDER") ?? "anthropic") as LlmProvider,
  llmModel: env("LLM_MODEL"),
  anthropicApiKey: env("ANTHROPIC_API_KEY"),
  xaiApiKey: env("XAI_API_KEY"),

  /** 검색해서 LLM 에 넘길 리뷰 수. 이 k 건이 답변의 전체 근거가 된다. */
  topK: Number(env("RAG_TOP_K") ?? 5),

  /** 인덱싱 시 한 번에 임베딩할 문서 수. */
  batchSize: 32,
} as const;

/** 벡터 차원. 인덱스를 만든 뒤에는 바꿀 수 없다. */
export const EMBEDDING_DIMENSION = 1024;

/**
 * 설정이 갖춰졌는지 확인한다. 부족하면 사람이 읽을 수 있는 이유를 돌려준다.
 * 라우트가 이걸 먼저 부르고, 크래시 대신 400 과 안내 문구를 내보낸다.
 */
export function checkRagConfig(): string[] {
  const missing: string[] = [];
  if (!ragConfig.pineconeApiKey) missing.push("PINECONE_API_KEY");
  if (ragConfig.llmProvider === "anthropic" && !ragConfig.anthropicApiKey) {
    missing.push("ANTHROPIC_API_KEY");
  }
  if (ragConfig.llmProvider === "xai" && !ragConfig.xaiApiKey) missing.push("XAI_API_KEY");
  return missing;
}

export function reviewToText(review: Review): string {
  // 별점을 본문에 섞어 임베딩한다. "별로예요"와 "별 1개"가 가까워지도록.
  return `[별점 ${review.rating}점] ${review.content}`;
}
