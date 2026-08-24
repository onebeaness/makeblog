import { OllamaEmbeddings } from "@langchain/ollama";
import { Pinecone } from "@pinecone-database/pinecone";
import { EMBEDDING_DIMENSION, ragConfig } from "./config";

/**
 * 임베딩 = 텍스트를 좌표로 바꾸는 일.
 *
 * "운동할 때 써도 되나요?" 와 "러닝하면서 들었는데 안 빠져요" 는 겹치는 단어가
 * 하나도 없다. 키워드 검색으로는 못 찾는다. 그런데 벡터로 바꾸면 두 좌표가
 * 가깝다. 검색이 "가까운 좌표 찾기"라는 수학 문제로 바뀌는 것이 요점이다.
 *
 * 제공자를 갈아끼울 수 있게 만든 이유:
 * 명세는 Ollama 로컬을 지정했지만, 배포된 서버는 당신 PC 의 Ollama 에
 * 접속할 수 없다. 로컬에서는 모델을 비교하고(03절), 배포에서는 호스팅
 * 임베딩을 쓰도록 한 줄로 바꿀 수 있어야 한다.
 */
export type Embedder = {
  /** Pinecone 네임스페이스로도 쓰인다. 모델이 다르면 좌표계가 다르다. */
  namespace: string;
  model: string;
  dimension: number;
  /** 저장할 문서들을 벡터로. */
  embedDocuments(texts: string[]): Promise<number[][]>;
  /** 검색할 질문을 벡터로. 반드시 문서와 같은 모델이어야 한다. */
  embedQuery(text: string): Promise<number[]>;
};

/** "qwen3-embedding:0.6b" → "qwen3-embedding-0-6b" 처럼 네임스페이스로 쓸 수 있게. */
function slug(model: string): string {
  return model.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function createOllamaEmbedder(): Embedder {
  const model = ragConfig.ollamaEmbeddingModel;
  const client = new OllamaEmbeddings({ baseUrl: ragConfig.ollamaBaseUrl, model });

  return {
    namespace: ragConfig.pineconeNamespace ?? slug(model),
    model,
    dimension: EMBEDDING_DIMENSION,
    embedDocuments: (texts) => client.embedDocuments(texts),
    embedQuery: (text) => client.embedQuery(text),
  };
}

function createPineconeEmbedder(): Embedder {
  const model = ragConfig.pineconeEmbeddingModel;
  const pc = new Pinecone({ apiKey: ragConfig.pineconeApiKey! });

  // 저장할 때와 검색할 때 inputType 이 다르다. 같은 모델이 문서용/질문용
  // 좌표를 조금 다르게 만든다 — 비대칭 검색이라고 부른다.
  async function embed(texts: string[], inputType: "passage" | "query") {
    const res = await pc.inference.embed({
      model,
      inputs: texts,
      parameters: { inputType, truncate: "END" },
    });
    return res.data.map((d) => {
      const values = (d as { values?: number[] }).values;
      if (!values) throw new Error(`임베딩 응답에 벡터가 없습니다 (model: ${model})`);
      return values;
    });
  }

  return {
    namespace: ragConfig.pineconeNamespace ?? slug(model),
    model,
    dimension: EMBEDDING_DIMENSION,
    embedDocuments: (texts) => embed(texts, "passage"),
    embedQuery: async (text) => (await embed([text], "query"))[0],
  };
}

export function createEmbedder(): Embedder {
  return ragConfig.embeddingProvider === "ollama"
    ? createOllamaEmbedder()
    : createPineconeEmbedder();
}
