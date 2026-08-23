"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type WriteState = { error: string | null; code?: string };

const TITLE_MAX = 200;
const CONTENT_MAX = 20_000;

export async function createPost(_prev: WriteState, formData: FormData): Promise<WriteState> {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "");

  if (!title) return { error: "제목을 입력하세요." };
  if (title.length > TITLE_MAX) return { error: `제목은 ${TITLE_MAX}자를 넘을 수 없습니다.` };
  if (content.length > CONTENT_MAX) return { error: `본문은 ${CONTENT_MAX}자를 넘을 수 없습니다.` };

  const supabase = await createClient();

  // user_id 를 보내지 않는다. 컬럼 default 가 auth.uid() 이고,
  // INSERT 정책의 with check 가 그 값을 다시 검사한다.
  const { data, error } = await supabase
    .from("posts")
    .insert({ title, content })
    .select("id")
    .single();

  if (error) {
    // 42501 = RLS 위반. 정책을 아직 만들지 않았거나 로그아웃 상태다.
    // 학습용으로 원인 코드를 그대로 노출한다.
    return { error: error.message, code: error.code };
  }

  revalidatePath("/");
  redirect(`/posts/${data.id}`);
}

export type DeleteResult = { ok: boolean; message?: string };

export async function deletePost(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();

  // .select() 를 붙여 "몇 행이 지워졌는지"를 돌려받는다.
  // 남의 글을 지우려 하면 에러가 아니라 0행이 온다 — using 조건에 맞지 않는
  // 행은 애초에 보이지 않기 때문이다. 이걸 구분하지 않으면
  // 아무것도 안 지웠는데 "삭제됨"이라고 말하는 UI 가 된다.
  const { data, error } = await supabase.from("posts").delete().eq("id", id).select("id");

  if (error) {
    redirect(`/posts/${id}?error=${encodeURIComponent(error.message)}`);
  }
  if (!data || data.length === 0) {
    redirect(`/posts/${id}?error=${encodeURIComponent("이 글을 삭제할 권한이 없습니다.")}`);
  }

  revalidatePath("/");
  redirect("/");
}
