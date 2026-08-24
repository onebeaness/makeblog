import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { hasSupabaseEnv } from "./env";

/**
 * Server Component · Server Action · Route Handler 에서 쓰는 수파베이스 클라이언트.
 *
 * 브라우저용 클라이언트와의 차이는 세션을 어디에 두느냐 하나다.
 * 브라우저 클라이언트는 localStorage 에 토큰을 넣지만, 그러면 서버는
 * 로그인 여부를 알 수 없다 — 서버에서 auth.uid() 가 NULL 이 되고
 * RLS 의 INSERT/DELETE 정책이 전부 실패한다.
 * 그래서 세션을 "쿠키"에 둔다. 쿠키는 매 요청마다 서버로 오기 때문이다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component 렌더링 중에는 쿠키를 쓸 수 없다.
            // 토큰 갱신은 middleware 가 대신 처리하므로 여기서는 무시해도 된다.
          }
        },
      },
    },
  );
}

/**
 * 현재 로그인한 사용자. 없으면 null.
 *
 * getSession() 이 아니라 getUser() 를 쓴다. getSession() 은 쿠키에 든 값을
 * 그대로 믿지만, getUser() 는 인증 서버에 물어봐서 토큰을 검증한다.
 * 쿠키는 사용자가 조작할 수 있으므로 서버에서는 반드시 후자를 써야 한다.
 */
export async function getCurrentUser() {
  if (!hasSupabaseEnv) return null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    // 인증 서버에 못 닿았다고 화면 전체가 죽으면 안 된다.
    // 확인할 수 없으면 "로그인하지 않음"으로 다룬다 — 안전한 쪽 기본값이다.
    console.error("[auth] 사용자 확인 실패 — 로그아웃으로 간주합니다:", error);
    return null;
  }
}
