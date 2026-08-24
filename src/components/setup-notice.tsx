export default function SetupNotice() {
  return (
    <div className="border-l-[3px] border-ink bg-surface p-5">
      <p className="mb-3 font-mono text-[11px] font-bold tracking-[0.08em] text-ink uppercase">
        Setup required
      </p>
      <p className="mb-3 text-sm text-ink-soft">
        수파베이스 환경 변수가 없거나 형식이 올바르지 않습니다. 로컬은{" "}
        <code className="bg-surface-2 px-1 py-0.5 font-mono text-ink">.env.local</code>, 배포 환경은
        호스팅 서비스의 Environment Variables 화면에서 두 값을 확인하세요.
      </p>
      <pre className="mb-3 overflow-x-auto border border-rule bg-bg p-3 font-mono text-xs text-ink">
{`NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx   (또는 eyJhbGciOi... )`}
      </pre>
      <ul className="mb-3 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
        <li>
          URL 은 <strong className="text-ink">반드시 <code className="bg-surface-2 px-1 py-0.5 font-mono">https://</code> 로 시작</strong>합니다.
        </li>
        <li>
          키는 <code className="bg-surface-2 px-1 py-0.5 font-mono">sb_publishable_</code> 로 시작하는 새 형식,
          또는 <code className="bg-surface-2 px-1 py-0.5 font-mono">eyJ</code> 로 시작하는 옛 형식 둘 다 됩니다.
        </li>
        <li>
          두 값은 <strong className="text-ink">같은 프로젝트</strong>의 것이어야 합니다.
        </li>
      </ul>
      <p className="text-sm text-ink-soft">
        수파베이스 대시보드 → Project Settings → API Keys 에서 복사합니다. 자세한 절차는 README 의
        &ldquo;시작하기&rdquo;를 보세요.
      </p>
    </div>
  );
}
