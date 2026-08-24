import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";

export default async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-5">
        <Link
          href="/"
          className="font-mono text-sm font-bold tracking-[0.14em] text-ink uppercase"
        >
          Devlog
        </Link>
        <Link
          href="/chat"
          className="font-mono text-xs tracking-wide text-ink-faint transition-colors hover:text-ink"
        >
          리뷰 챗봇
        </Link>
        <div className="flex-1" />
        {user ? (
          <>
            <Link
              href="/write"
              className="border border-rule-firm px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              글쓰기
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="border border-rule-firm px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
              >
                로그아웃
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/auth"
            className="border border-rule-firm px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            로그인
          </Link>
        )}
      </div>
    </header>
  );
}
