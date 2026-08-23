"use client";

import { useFormStatus } from "react-dom";
import { deletePost } from "@/app/actions/posts";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="border border-rule-firm px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
    >
      {pending ? "삭제 중…" : "삭제"}
    </button>
  );
}

/**
 * 위험한 동작이지만 빨강을 쓰지 않는다. 대신 확인 절차로 경고를 대신한다.
 * confirm() 은 실수 방지용일 뿐, 권한 검사는 서버(그리고 RLS)가 한다.
 */
export default function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deletePost}
      onSubmit={(event) => {
        if (!window.confirm("이 글을 삭제할까요? 되돌릴 수 없습니다.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Submit />
    </form>
  );
}
