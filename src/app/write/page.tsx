import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import SetupNotice from "@/components/setup-notice";
import WriteForm from "./write-form";

export const dynamic = "force-dynamic";

export default async function WritePage() {
  if (!hasSupabaseEnv) return <SetupNotice />;

  // middleware 에서도 막지만 여기서 한 번 더 확인한다.
  // middleware 는 편의(빠른 리다이렉트)이고, 진짜 방어선은 서버와 RLS 다.
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=/write");

  return (
    <div>
      <h1 className="mb-8 text-2xl font-black tracking-tight text-ink">글쓰기</h1>
      <WriteForm />
    </div>
  );
}
