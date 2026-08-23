import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import SetupNotice from "@/components/setup-notice";
import { formatDate } from "@/lib/format";
import DeleteButton from "./delete-button";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PostPage({ params, searchParams }: PageProps<"/posts/[id]">) {
  if (!hasSupabaseEnv) return <SetupNotice />;

  const { id } = await params;
  const { error: errorParam } = await searchParams;

  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data } = await supabase
    .from("posts")
    .select("id, user_id, title, content, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const post = data as Post;

  // 삭제 버튼을 감추는 것은 "편의"이지 "보안"이 아니다.
  // 실제 차단은 DELETE 정책의 using (auth.uid() = user_id) 가 한다.
  const isMine = user?.id === post.user_id;

  return (
    <article>
      <Link href="/" className="font-mono text-xs text-ink-faint hover:text-ink">
        ← 목록
      </Link>

      <h1 className="mt-6 text-3xl font-black leading-tight tracking-tight text-ink text-balance">
        {post.title}
      </h1>
      <p className="mt-3 font-mono text-xs text-ink-faint">
        {formatDate(post.created_at)}
        {isMine ? " · 내 글" : ""}
      </p>

      {typeof errorParam === "string" && errorParam ? (
        <p
          role="alert"
          className="mt-6 border-l-[3px] border-ink bg-surface px-4 py-3 text-sm text-ink-soft"
        >
          {errorParam}
        </p>
      ) : null}

      {/* 본문은 plain text 다. HTML 로 해석하지 않는다 — 그래야 남의 글이
          스크립트를 심을 수 없다. 줄바꿈만 CSS 로 살린다. */}
      <div className="mt-10 border-t border-rule pt-8 text-[15px] whitespace-pre-wrap text-ink-soft">
        {post.content}
      </div>

      {isMine ? (
        <div className="mt-12 border-t border-rule pt-6">
          <DeleteButton id={post.id} />
        </div>
      ) : null}
    </article>
  );
}
