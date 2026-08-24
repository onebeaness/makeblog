import { ChatAnthropic } from "@langchain/anthropic";
import { ChatXAI } from "@langchain/xai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ragConfig } from "./config";

/**
 * 답변을 쓰는 모델. 여기가 "한 줄만 바꾸면 교체되는" 자리다 —
 * 명세 02절이 LangChain 을 고른 이유 그 자체다.
 * 프롬프트·검색·Pinecone 연동은 전혀 손대지 않는다.
 */

const DEFAULT_MODEL: Record<string, string> = {
  anthropic: "claude-opus-5",
  xai: "grok-4",
};

export function createLlm(): BaseChatModel {
  const model = ragConfig.llmModel ?? DEFAULT_MODEL[ragConfig.llmProvider];

  if (ragConfig.llmProvider === "xai") {
    return new ChatXAI({ apiKey: ragConfig.xaiApiKey, model });
  }

  return new ChatAnthropic({
    apiKey: ragConfig.anthropicApiKey,
    model,
    // 상한일 뿐 비용이 아니다. 낮게 잡으면 답변이 문장 중간에서 잘린다.
    maxTokens: 16000,
    // 리뷰 5건을 읽고 정리하는 단순한 일이다. 깊게 생각할 필요가 없다.
    outputConfig: { effort: "low" },
    // temperature 를 넘기지 않는다 — Opus 5 · Sonnet 5 는 이 값을 받으면 400 이다.
  });
}

export function llmLabel(): string {
  return `${ragConfig.llmProvider}/${ragConfig.llmModel ?? DEFAULT_MODEL[ragConfig.llmProvider]}`;
}
