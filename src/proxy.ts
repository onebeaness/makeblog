import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

/**
 * Next.js 16 의 proxy(구 middleware). 모든 요청이 페이지에 닿기 전에 지나간다.
 * 여기서 하는 일은 두 가지: 토큰 갱신, 그리고 /write 접근 차단.
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // 정적 파일과 이미지 최적화 요청은 건드리지 않는다.
    // /api 도 뺀다 — 챗봇 라우트는 로그인과 무관한데, 매 요청마다
    // 수파베이스에 사용자 확인을 다녀오면 응답만 느려진다.
    // 인증이 필요한 라우트가 생기면 그 안에서 getUser() 를 부르면 된다.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
