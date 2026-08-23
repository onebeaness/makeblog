import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저(Client Component)용 수파베이스 클라이언트.
 *
 * 이 앱의 정상 경로에서는 쓰지 않는다. 데이터 접근은 전부 서버에서 한다.
 * 06절 "보안 실험"에서 클라이언트 직접 호출이 어떻게 보이는지 관찰할 때만 쓴다.
 * (docs/security-experiment.md 참고)
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
