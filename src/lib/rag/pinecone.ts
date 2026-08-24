import { Pinecone } from "@pinecone-database/pinecone";
import { EMBEDDING_DIMENSION, ragConfig } from "./config";
import type { Source } from "./types";

/**
 * 벡터 DB. 수파베이스와 역할이 다르다.
 *
 *   수파베이스 : 조건으로 찾는다   where rating = 5
 *   Pinecone   : 의미로 찾는다     이 질문과 가까운 리뷰 5건
 *
 * 같은 리뷰가 양쪽에 들어가고 id 로 짝을 맞춘다.
 */
export function pineconeClient() {
  if (!ragConfig.pineconeApiKey) throw new Error("PINECONE_API_KEY 가 없습니다.");
  return new Pinecone({ apiKey: ragConfig.pineconeApiKey });
}

/** 인덱스가 없으면 만든다. 차원은 만든 뒤 바꿀 수 없다. */
export async function ensureIndex(): Promise<void> {
  const pc = pineconeClient();
  const { indexes } = await pc.listIndexes();
  if (indexes?.some((i) => i.name === ragConfig.pineconeIndex)) return;

  await pc.createIndex({
    name: ragConfig.pineconeIndex,
    dimension: EMBEDDING_DIMENSION,
    metric: "cosine",
    spec: { serverless: { cloud: "aws", region: "us-east-1" } },
    waitUntilReady: true,
  });
}

export type UpsertRecord = {
  id: string;
  values: number[];
  metadata: { content: string; rating: number };
};

export async function upsertVectors(namespace: string, records: UpsertRecord[]): Promise<void> {
  const index = pineconeClient().index(ragConfig.pineconeIndex).namespace(namespace);
  // Pinecone 은 한 번에 보낼 수 있는 양에 제한이 있다. 나눠서 보낸다.
  for (let i = 0; i < records.length; i += 100) {
    await index.upsert({ records: records.slice(i, i + 100) });
  }
}

/** 질문 벡터와 가까운 리뷰 topK 건. 이 결과가 답변의 전체 근거가 된다. */
export async function searchSimilar(
  namespace: string,
  vector: number[],
  topK: number,
): Promise<Source[]> {
  const index = pineconeClient().index(ragConfig.pineconeIndex).namespace(namespace);
  const res = await index.query({ vector, topK, includeMetadata: true });

  return (res.matches ?? []).map((m) => ({
    id: m.id,
    content: String(m.metadata?.content ?? ""),
    rating: Number(m.metadata?.rating ?? 0),
    score: Number(m.score ?? 0),
  }));
}
