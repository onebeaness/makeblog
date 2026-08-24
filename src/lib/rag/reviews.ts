import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import type { Review } from "./types";

/**
 * 랭체인 5단계 중 1단계 Document Loaders 에 해당한다.
 * CSVLoader 를 쓸 수도 있지만, 열 이름을 그대로 타입에 옮기는 편이
 * 무엇이 들어오는지 눈에 보인다.
 *
 * 2단계 Text Splitters 는 이번 프로젝트에서 사실상 무동작이다 —
 * 리뷰 한 건이 이미 짧아서 자를 필요가 없다. 리뷰 1건 = 청크 1개.
 * 긴 PDF 로 RAG 를 만들면 그때 여기가 품질을 좌우한다.
 */
export async function loadReviews(): Promise<Review[]> {
  const file = path.join(process.cwd(), "samples", "reviews.csv");
  const raw = await readFile(file, "utf8");

  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true }) as Record<
    string,
    string
  >[];

  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    rating: Number(r.rating),
    author: r.author ?? "",
    created_at: r.created_at ?? "",
  }));
}
