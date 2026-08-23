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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
