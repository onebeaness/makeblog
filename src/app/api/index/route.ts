import { NextResponse } from "next/server";
import { loadReviews } from "@/lib/rag/reviews";
import { createEmbedder } from "@/lib/rag/embeddings";
import { ensureIndex, upsertVectors, type UpsertRecord } from "@/lib/rag/pinecone";
import { ragConfig, checkRagConfig, reviewToText } from "@/lib/rag/config";

/**
 * POST /api/index — 리뷰 100건을 벡터로 바꿔 Pinecone 에 넣는다. 한 번만 돌리면 된다.
 *
 * 이 라우트가 왜 반드시 서버여야 하는가:
 * PINECONE_API_KEY 에는 NEXT_PUBLIC_ 접두사가 없다. 붙이면 안 된다.
 * 수파베이스 anon key 는 RLS 가 지켜주니 노출해도 됐지만, 이 키는
 * 지켜줄 것이 없다. 노출되는 순간 아무나 내 인덱스를 지울 수 있다.
 */

// 파일을 읽고 외부 API 를 부른다. 캐시하지 않는다.
export const dynamic = "force-dynamic";
// 100건 임베딩 + 업서트는 기본 제한시간을 넘길 수 있다.
export const maxDuration = 300;

export async function POST() {
  const missing = checkRagConfig();
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `환경 변수가 없습니다: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const reviews = await loadReviews();
    const embedder = createEmbedder();

    await ensureIndex();

    let indexed = 0;
    for (let i = 0; i < reviews.length; i += ragConfig.batchSize) {
      const batch = reviews.slice(i, i + ragConfig.batchSize);
      const vectors = await embedder.embedDocuments(batch.map(reviewToText));

      const records: UpsertRecord[] = batch.map((review, n) => ({
        // 벡터 ID 를 리뷰 ID 와 똑같이 맞춘다. 이래야 검색 결과로 원문을 찾을 수 있다.
        id: review.id,
        values: vectors[n],
        // 메타데이터에 본문을 같이 넣어, 출처 카드를 그릴 때 DB 를 한 번 더
        // 안 가도 되게 한다. 원문의 정본은 여전히 수파베이스에 있다.
        metadata: { content: review.content, rating: review.rating },
      }));

      await upsertVectors(embedder.namespace, records);
      indexed += records.length;
    }

    return NextResponse.json({
      indexed,
      namespace: embedder.namespace,
      model: embedder.model,
      provider: ragConfig.embeddingProvider,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[api/index] 인덱싱 실패:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
