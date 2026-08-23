<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 프로젝트 규칙 — 그레이스케일 개발자 블로그

## 이 프로젝트가 증명하려는 것

**"로그인한 사람이 자기 글만 쓰고 고칠 수 있는가."** 이 한 줄에 기여하지 않는
기능은 추가하지 않는다. 댓글·좋아요·검색·이미지 업로드는 v2 다.

## 데이터베이스

- **마이그레이션을 직접 실행하지 말 것.** `supabase/migrations/` 의 SQL 을
  사람이 수파베이스 SQL Editor 에 붙여넣어 실행한다. 스키마 변경이 필요하면
  새 파일을 만들고, 실행은 사람에게 맡긴다.
- 테이블은 `posts` 하나. 사용자는 `auth.users` 를 그대로 참조한다.
- RLS 정책을 바꾸면 `supabase/tests/rls_test.sql` 에 검증을 추가한다.

## 데이터 접근

- **데이터 접근은 서버에서 한다.** 읽기는 Server Component, 쓰기·삭제는
  Server Action. `src/lib/supabase/client.ts`(브라우저 클라이언트)는
  06절 보안 실험 전용이며 정상 경로에서 쓰지 않는다.
- 사용자 확인은 `getUser()` 로 한다. `getSession()` 은 쿠키 값을 그대로 믿는다.
- `select("*")` 를 쓰지 않는다. 화면에 필요한 열만 고른다.
- 삭제는 `.select()` 를 붙여 영향 행 수를 확인한다. RLS 로 막힌 삭제는
  에러가 아니라 **0행**으로 돌아온다.

## 보안

- `service_role` 키는 이 저장소에 들어오지 않는다. RLS 를 통째로 우회한다.
- UI 에서 버튼을 감추는 것은 편의이지 보안이 아니다. 차단은 항상 서버와 RLS.
- 사용자 입력을 `dangerouslySetInnerHTML` 로 그리지 않는다. 본문은 plain text.

## 스타일

- 무채색만 쓴다. 색상 유틸리티(`text-blue-500` 등)를 쓰지 않는다.
- 색 토큰은 `src/app/globals.css` 의 `--ink*` / `--rule*` / `--surface*` 만 사용.
- 위험한 동작은 빨강 대신 확인 절차로 경고한다.

## 커밋

- 구현 순서의 각 단계가 끝날 때마다 커밋한다. 되돌릴 수 있는 상태를 유지한다.
