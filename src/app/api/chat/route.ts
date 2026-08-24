import { NextResponse } from "next/server";
import { answerQuestion, retrieve } from "@/lib/rag/chain";
import { checkRagConfig } from "@/lib/rag/config";

/**
 * POST /api/chat  { question }  →  { answer, sources[] }
 *
 * sources 의 각 항목에 score(유사도)를 그대로 실어 보낸다.
 * 검색이 왜 이 리뷰를 골랐는지 화면에서 확인하기 위해서다.
 * 디버깅 수단이자 학습 수단이다 — 답이 이상할 때 검색 탓인지 LLM 탓인지
 * 구분하려면 이 숫자가 있어야 한다.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_QUESTION_LENGTH = 500;

export async function POST(request: Request) {
  const missing = checkRagConfig();
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `환경 변수가 없습니다: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  let question: string;
  let retrieveOnly = false;
  try {
    const body = (await request.json()) as { question?: unknown; retrieveOnly?: unknown };
    question = typeof body.question === "string" ? body.question.trim() : "";
    retrieveOnly = body.retrieveOnly === true;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (!question) {
    return NextResponse.json({ error: "질문을 입력하세요." }, { status: 400 });
  }
  // 질문 하나가 LLM 호출 하나다. 길이를 막지 않으면 요금이 막히지 않는다.
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `질문은 ${MAX_QUESTION_LENGTH}자를 넘을 수 없습니다.` },
      { status: 400 },
    );
  }

  try {
    // 명세 08절 3단계 — LLM 을 붙이기 전에 검색 결과를 날것으로 본다.
    // 여기서 엉뚱한 리뷰가 나오는데 그냥 넘어가면, 이후 모든 이상한 답변의
    // 원인을 LLM 탓으로 오해하게 된다. 평가 스크립트도 이 경로를 쓴다
    // (15문항에 LLM 을 부르지 않으니 요금이 들지 않는다).
    if (retrieveOnly) {
      return NextResponse.json({ answer: "", ...(await retrieve(question)) });
    }
    return NextResponse.json(await answerQuestion(question));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[api/chat] 실패:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
