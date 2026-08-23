import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasSupabaseEnv } from "./env";

/** 로그인해야 들어갈 수 있는 경로. */
const PROTECTED = ["/write"];

/**
 * 매 요청마다 액세스 토큰을 갱신하고, 갱신된 쿠키를 응답에 다시 실어 보낸다.
 *
 * 이게 없으면 토큰이 만료된 뒤 서버는 사용자를 "로그아웃 상태"로 보게 되고,
 * 브라우저는 여전히 로그인한 것처럼 보이는 어긋남이 생긴다.
 */
export async function updateSession(request: NextRequest) {
  // 환경 변수가 없으면 아무것도 하지 않는다. 안내 화면이 대신 뜬다.
  if (!hasSupabaseEnv) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // 이 호출이 토큰 갱신을 일으킨다. 지우면 안 된다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (!user && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
