export default function SetupNotice() {
  return (
    <div className="border-l-[3px] border-ink bg-surface p-5">
      <p className="mb-2 font-mono text-[11px] font-bold tracking-[0.08em] text-ink uppercase">
        Setup required
      </p>
      <p className="mb-2 text-sm text-ink-soft">
        <code className="bg-surface-2 px-1 py-0.5 font-mono text-ink">.env.local</code> 에 수파베이스
        환경 변수가 없습니다. <code className="bg-surface-2 px-1 py-0.5 font-mono text-ink">.env.local.example</code>
        를 복사해 값을 채운 뒤 개발 서버를 다시 시작하세요.
      </p>
      <p className="text-sm text-ink-soft">자세한 절차는 README 의 &ldquo;시작하기&rdquo;를 보세요.</p>
    </div>
  );
}
