"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";

const initial: AuthState = { error: null };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-invert-bg px-5 py-2.5 text-sm font-bold text-invert-ink transition-opacity hover:opacity-85 disabled:opacity-50"
    >
      {pending ? "처리 중…" : label}
    </button>
  );
}

export default function AuthForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInAction] = useActionState(signIn, initial);
  const [signUpState, signUpAction] = useActionState(signUp, initial);

  const isSignUp = mode === "signup";
  const state = isSignUp ? signUpState : signInState;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black tracking-tight text-ink">
        {isSignUp ? "회원가입" : "로그인"}
      </h1>

      {/* key 를 바꿔 폼을 새로 만든다 — 모드를 바꾸면 이전 오류가 남지 않는다. */}
      <form key={mode} action={isSignUp ? signUpAction : signInAction} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="이메일"
          aria-label="이메일"
          className="w-full border border-rule-firm bg-bg px-4 py-3 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
        />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          placeholder="비밀번호 (6자 이상)"
          aria-label="비밀번호"
          className="w-full border border-rule-firm bg-bg px-4 py-3 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
        />

        {state.error ? (
          <p role="alert" className="border-l-[3px] border-ink bg-surface px-4 py-3 text-sm text-ink-soft">
            {state.error}
          </p>
        ) : null}

        <Submit label={isSignUp ? "가입하기" : "로그인"} />
      </form>

      <p className="mt-6 text-center text-sm text-ink-faint">
        {isSignUp ? "이미 계정이 있나요?" : "계정이 없나요?"}{" "}
        <button
          type="button"
          onClick={() => setMode(isSignUp ? "signin" : "signup")}
          className="text-ink underline underline-offset-4"
        >
          {isSignUp ? "로그인" : "회원가입"}
        </button>
      </p>
    </div>
  );
}
