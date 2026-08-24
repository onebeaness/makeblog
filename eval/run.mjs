/**
 * 임베딩 모델 비교 — 명세 03절 · 08절 5단계
 *
 *   1) npm run dev        (다른 터미널에서)
 *   2) npm run eval
 *
 * LLM 을 부르지 않는다(retrieveOnly). 15문항을 돌려도 요금이 들지 않는다.
 * 재는 것은 "검색"이지 "답변"이 아니기 때문이기도 하다 —
 * 검색이 놓친 정보는 LLM 이 절대 복구하지 못한다.
 *
 * 모델을 바꿔 다시 재려면 .env.local 의 임베딩 설정을 바꾸고
 * 인덱싱(/api/index)을 다시 돌린 뒤 이 스크립트를 또 실행한다.
 * 결과는 네임스페이스별로 따로 저장되므로 나중에 나란히 볼 수 있다.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";

const BASE = process.env.EVAL_BASE_URL ?? "http://localhost:3000";
const TOP_K = Number(process.env.RAG_TOP_K ?? 5);

const { questions } = JSON.parse(await readFile("eval/questions.json", "utf8"));

async function search(question) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, retrieveOnly: true }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

console.log(`대상: ${BASE}  ·  질문 ${questions.length}개  ·  top-${TOP_K}\n`);

let namespace = "?";
let model = "?";
const rows = [];

for (const { q, relevant } of questions) {
  const data = await search(q);
  namespace = data.namespace ?? namespace;
  model = data.model ?? model;

  const got = data.sources.map((s) => s.id);
  // Recall@5 — 넘겨줄 5건 안에 근거가 하나라도 들어왔는가.
  // LLM 에 5건만 넘기므로, 그 안에 없으면 답은 반드시 틀린다.
  const hit = got.some((id) => relevant.includes(id));
  // MRR — 첫 정답이 몇 번째로 나왔는가. 1/순위.
  const firstRank = got.findIndex((id) => relevant.includes(id)) + 1;
  const rr = firstRank > 0 ? 1 / firstRank : 0;

  rows.push({ q, hit, firstRank, rr, got, topScore: data.sources[0]?.score ?? 0 });
  console.log(
    `${hit ? "O" : "X"}  ${q}\n   상위: ${got.join(", ") || "(없음)"}` +
      `${firstRank > 0 ? `   첫 정답 ${firstRank}위` : ""}`,
  );
}

const recall = rows.filter((r) => r.hit).length / rows.length;
const mrr = rows.reduce((a, r) => a + r.rr, 0) / rows.length;

console.log(`\n네임스페이스 ${namespace}  ·  모델 ${model}`);
console.log(`Recall@${TOP_K}  ${(recall * 100).toFixed(1)}%   (${rows.filter(r=>r.hit).length}/${rows.length})`);
console.log(`MRR         ${mrr.toFixed(3)}`);

await mkdir("eval/results", { recursive: true });
const out = `eval/results/${namespace}.json`;
await writeFile(
  out,
  JSON.stringify({ namespace, model, topK: TOP_K, recall, mrr, rows }, null, 2) + "\n",
  "utf8",
);
console.log(`\n기록: ${out}`);

if (!rows.some((r) => r.hit)) {
  console.error("\n한 문항도 맞히지 못했습니다. 인덱싱(/api/index)을 먼저 돌렸는지,");
  console.error("인덱싱과 검색이 같은 임베딩 모델인지 확인하세요 — 모델이 다르면 좌표계가 다릅니다.");
  process.exit(1);
}
