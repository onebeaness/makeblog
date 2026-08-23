import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import SetupNotice from "@/components/setup-notice";
import AuthForm from "./auth-form";

export const dynamic = "force-dynamic";

export default async function AuthPage({ searchParams }: PageProps<"/auth">) {
  if (!hasSupabaseEnv) return <SetupNotice />;

  const { next } = await searchParams;
  const target = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const user = await getCurrentUser();
  if (user) redirect(target);

  return (
    <div className="mx-auto max-w-sm">
      <AuthForm next={target} />
    </div>
  );
}
