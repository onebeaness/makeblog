import { ChatPromptTemplate } from "@langchain/core/prompts";
import type { Source } from "./types";

/**
 * RAG 의 목적은 아는 것을 잘 답하는 게 아니라
 * **모르는 것을 지어내지 않는 것**이다. 그건 프롬프트에 명시해야 지켜진다.
 *
 * 명세 09절의 완료 기준 중 가장 중요한 항목이 여기서 결정된다:
 * "리뷰에 없는 내용을 물으면 모른다고 답한다."
 */
export const RAG_PROMPT = ChatPromptTemplate.fromMessages([
  [
    "system",
    `당신은 상품 리뷰를 근거로만 답하는 도우미입니다.

규칙:
1. 아래 <리뷰> 안의 내용만 근거로 삼습니다. 일반 상식이나 다른 제품 지식을 끌어오지 마세요.
2. 리뷰에 없는 내용을 물으면 "리뷰에서 관련 내용을 찾지 못했습니다"라고 답하세요.
   추측하거나 그럴듯하게 지어내지 마세요. 모른다고 답하는 것이 옳은 답입니다.
3. 의견이 갈리면 양쪽을 다 적으세요. 좋은 말만 골라 쓰지 마세요.
4. 3~5문장으로 짧게. 리뷰 번호(r001 같은)를 본문에 쓰지 마세요 — 출처는 화면이 따로 보여줍니다.
5. 한국어로 답하세요.

<리뷰>
{context}
</리뷰>`,
  ],
  ["human", "{question}"],
]);

/** 검색된 리뷰들을 프롬프트에 넣을 문자열로. */
export function formatContext(sources: Source[]): string {
  if (sources.length === 0) return "(관련 리뷰를 찾지 못했습니다.)";
  return sources
    .map((s, i) => `${i + 1}. (별점 ${s.rating}점) ${s.content}`)
    .join("\n");
}
