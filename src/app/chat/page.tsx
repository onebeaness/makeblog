import ChatClient from "./chat-client";
import { checkRagConfig, ragConfig } from "@/lib/rag/config";
import { llmLabel } from "@/lib/rag/llm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "리뷰 챗봇",
  description: "상품 리뷰를 근거로 답하는 RAG 챗봇.",
};

export default function ChatPage() {
  // 설정 확인은 서버에서 한다. 키 이름만 넘기고 값은 절대 넘기지 않는다.
  const missing = checkRagConfig();

  return (
    <ChatClient
      missingEnv={missing}
      embeddingLabel={`${ragConfig.embeddingProvider}/${
        ragConfig.embeddingProvider === "ollama"
          ? ragConfig.ollamaEmbeddingModel
          : ragConfig.pineconeEmbeddingModel
      }`}
      llmLabel={llmLabel()}
    />
  );
}
