/**
 * 환경 변수가 채워져 있는지 확인한다.
 *
 * 없을 때 수파베이스 클라이언트는 알아보기 힘든 오류로 죽는다.
 * 처음 클론한 사람이 무엇을 해야 하는지 화면에서 바로 알 수 있게 한다.
 */
export const hasSupabaseEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
