"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createPost, type WriteState } from "@/app/actions/posts";

const initial: WriteState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-invert-bg px-5 py-2 text-sm font-bold text-invert-ink transition-opacity hover:opacity-85 disabled:opacity-50"
    >
      {pending ? "발행 중…" : "발행"}
    </button>
  );
}

export default function WriteForm() {
  const [state, formAction] = useActionState(createPost, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input
        name="title"
        required
        maxLength={200}
        placeholder="제목"
        aria-label="제목"
        className="w-full border border-rule-firm bg-bg px-4 py-3 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
      />
      {/* 마크다운 미리보기 없음. textarea 하나. */}
      <textarea
        name="content"
        rows={14}
        maxLength={20000}
        placeholder="본문을 입력하세요…"
        aria-label="본문"
        className="w-full resize-y border border-rule-firm bg-bg px-4 py-3 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
      />

      {state.error ? (
        <p role="alert" className="border-l-[3px] border-ink bg-surface px-4 py-3 text-sm text-ink-soft">
          {state.error}
          {state.code ? (
            <span className="mt-1 block font-mono text-xs text-ink-faint">
              code: {state.code}
              {state.code === "42501"
                ? " — RLS 위반입니다. INSERT 정책이 있는지, 로그인 상태인지 확인하세요."
                : ""}
            </span>
          ) : null}
        </p>
      ) : null}

      <div className="flex justify-end pt-2">
        <Submit />
      </div>
    </form>
  );
}
