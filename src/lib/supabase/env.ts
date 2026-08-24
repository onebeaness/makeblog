/**
 * 환경 변수가 "쓸 수 있는 상태"인지 확인한다.
 *
 * 값이 있는지만 보지 않고 URL 형식까지 검사하는 이유가 있다.
 * createServerClient 는 URL 이 http(s) 가 아니면 그 자리에서 예외를 던진다.
 *   Error: Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.
 * 이 호출은 proxy 안에서 모든 요청마다 일어나므로, 값 하나가 틀리면
 * 안내 화면조차 못 뜨고 사이트 전체가 500 이 된다.
 * 여기서 미리 걸러 안내 화면으로 보낸다.
 */
function isHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export const hasSupabaseEnv =
  isHttpUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
