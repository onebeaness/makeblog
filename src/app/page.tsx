import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import SetupNotice from "@/components/setup-notice";
import { formatDate } from "@/lib/format";
import type { PostSummary } from "@/lib/types";

// 로그인 상태에 따라 화면이 달라지므로 캐시하지 않는다.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!hasSupabaseEnv) return <SetupNotice />;

  const supabase = await createClient();
  const user = await getCurrentUser();

  // 목록에는 본문이 필요 없다. 필요한 열만 고른다 —
  // select('*') 는 화면에 안 쓰는 값까지 네트워크로 내보낸다.
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <p className="text-sm text-ink-soft">
        글을 불러오지 못했습니다. <span className="font-mono text-ink-faint">{error.message}</span>
      </p>
    );
  }

  const posts = (data ?? []) as PostSummary[];

  return (
    <div>
      <h1 className="mb-8 text-2xl font-black tracking-tight text-ink">글 목록</h1>

      {posts.length === 0 ? (
        <p className="text-sm text-ink-soft">아직 글이 없습니다.</p>
      ) : (
        <ul className="border-t border-rule">
          {posts.map((post) => (
            <li key={post.id} className="border-b border-rule">
              <Link href={`/posts/${post.id}`} className="block py-5 group">
                <span className="block font-bold text-ink group-hover:underline">
                  {post.title}
                </span>
                <span className="mt-1 block font-mono text-xs text-ink-faint">
                  {formatDate(post.created_at)}
                  {user?.id === post.user_id ? " · 내 글" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
