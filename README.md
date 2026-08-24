# 그레이스케일 개발자 블로그 — MVP

글을 쓰고 읽는 최소한의 블로그. 색을 쓰지 않고 기능을 덜어내,
**인증과 권한이 어떻게 데이터를 지키는지**가 보이도록 만든 것이 이 버전의 목적이다.

- Next.js 16 (App Router) · React 19 · Tailwind CSS v4
- Supabase (Auth + PostgreSQL + RLS)
- 테이블 1개(`posts`), 정책 3개(SELECT / INSERT / DELETE)

---

## 시작하기

### 1. 수파베이스 프로젝트 만들기

[supabase.com](https://supabase.com) 에서 프로젝트를 만든다. Region 은 Seoul.

**Authentication → Providers → Email → Confirm email 을 끈다.**
켜져 있으면 가입할 때마다 인증 메일을 기다려야 해서 실습이 막힌다.
배포할 때는 반드시 다시 켠다 — 꺼두면 아무 이메일로나 가입할 수 있다.

### 2. 환경 변수

```bash
cp .env.local.example .env.local
```

Project Settings → **API Keys** 에서 두 값을 복사해 채운다.

- `NEXT_PUBLIC_SUPABASE_URL` — 반드시 `https://` 로 시작하는 전체 주소
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — 공개용 키. 수파베이스가 키 체계를
  바꾸는 중이라 두 형식이 있고 **둘 다 동작한다.**
  `sb_publishable_...`(새 형식) 또는 `eyJhbGciOi...`(옛 Legacy anon public)

두 값은 반드시 **같은 프로젝트**의 것이어야 한다. 섞이면
`Invalid API key` 가 뜬다. `sb_secret_` / `service_role` 로 시작하는 키는
절대 쓰지 않는다 — RLS 를 통째로 우회한다.

`.env.local` 은 `.gitignore` 에 들어 있다.

### 3. 스키마 올리기

`supabase/migrations/0001_posts.sql` 을 수파베이스 **SQL Editor** 에
붙여넣고 실행한다.

> 명세의 구현 순서를 그대로 따라가고 싶다면, INSERT 정책 부분을 **빼고**
> 먼저 실행하라. 글쓰기에서 `new row violates row-level security policy` 를
> 한 번 만난 뒤 정책을 추가하는 것이 이 프로젝트의 학습 포인트다.

### 4. 실행

```bash
npm install
npm run dev
```

`/auth` 에서 가입 → `/write` 에서 글쓰기.
목록에 글이 필요하면 `supabase/seed.sql` 을 SQL Editor 에서 실행한다
(가입을 한 번 마친 뒤에).

---

## 구조

그림으로 보려면 [`docs/architecture.md`](./docs/architecture.md) — 머메이드 다이어그램 5개.

```
src/
  proxy.ts                     매 요청 토큰 갱신 + /write 접근 차단
  lib/supabase/
    server.ts                  Server Component · Server Action 용 (쿠키 세션)
    client.ts                  브라우저용 — 06절 보안 실험 전용
    session.ts                 proxy 가 쓰는 세션 갱신 로직
  app/
    page.tsx                   / — 글 목록          Server   SELECT
    posts/[id]/page.tsx        /posts/[id] — 상세    Server   SELECT · DELETE
    write/                     /write — 글쓰기       Server + Client form  INSERT
    auth/                      /auth — 로그인·가입   Server + Client form
    actions/
      posts.ts                 createPost · deletePost   ("use server")
      auth.ts                  signIn · signUp · signOut ("use server")
supabase/
  migrations/0001_posts.sql    테이블 + RLS 정책 + 권한
  seed.sql                     시드 글 2개
  tests/                       RLS 정책 검증 (수파베이스 없이 로컬 PG 로 돈다)
docs/security-experiment.md    06절 보안 실험 절차
```

---

## RLS 테스트

정책이 "말한 대로" 동작하는지 로컬 PostgreSQL 로 검증한다.
수파베이스 계정도 네트워크도 필요 없다.

```bash
./supabase/tests/run.sh
```

`supabase/tests/00_local_shim.sql` 이 `auth.users` · `auth.uid()` ·
`anon` / `authenticated` 롤을 흉내 내고, 그 위에 실제 마이그레이션을 올린 뒤
13개 항목을 확인한다.

| 확인하는 것 |
| --- |
| anon 은 모든 글을 읽는다 |
| anon 은 글을 쓰거나 지울 수 없다 |
| 로그인 사용자는 자기 명의로만 글을 쓴다 (`with check`) |
| 남의 명의로 쓰려 하면 42501 로 거부된다 |
| 빈 제목은 check 제약에 걸린다 |
| **남의 글 삭제는 에러가 아니라 0행이다** (`using`) |
| 자기 글 삭제는 1행 |
| UPDATE 정책이 없으므로 아무도 수정할 수 없다 |
| 토큰 없는 `authenticated` 는 `auth.uid()` 가 NULL 이라 글을 못 쓴다 |

> 세 번째 항목이 이 프로젝트에서 가장 잘 놓치는 부분이다.
> RLS 로 막힌 삭제는 **조용히 0행**이 된다. 이걸 확인하지 않으면
> 아무것도 지우지 않고 "삭제됐습니다"라고 말하는 UI 가 된다.
> `deletePost` 가 `.select()` 로 영향 행 수를 세는 이유다.

---

## 보안 실험 (명세 06절)

`docs/security-experiment.md` 참고.

---

## 명세에서 바꾼 것

원본 MVP 명세(REV 0.1)를 그대로 구현하지 않았다. 바꾼 곳과 이유는
`docs/spec-review.md` 에 정리했다. 요약하면:

| 명세 | 이 구현 | 이유 |
| --- | --- | --- |
| `/write` 를 Client Component 로 | 폼만 Client, 데이터 접근은 Server Action | 명세의 완료 기준("Network 탭에 수파베이스 요청 없음")과 충돌 |
| 세션 관리 언급 없음 | `@supabase/ssr` 쿠키 세션 + proxy | 없으면 서버에서 `auth.uid()` 가 NULL 이라 RLS 가 전부 실패 |
| 목록에 작성자 이름 표시 | 날짜 + "내 글" 표시만 | 한 테이블로는 작성자 이름을 안전하게 낼 수 없다 |
| 메타 색 `#8C8C8C` | `#6B6B6B` | 대비 3.0:1 → 5.3:1 (WCAG AA) |
| 정책 3개 | 정책 3개 + 명시적 GRANT | 권한과 RLS 는 서로 다른 층이다 |

---

## 다음 단계 (v2)

- **댓글** — 1:N 관계, NULL 허용 외래키
- **좋아요** — N:N 중간 테이블, 복합 기본키로 중복 방지
- **글 수정** — `using` 과 `with check` 를 동시에 쓰는 유일한 작업
- **배포** — 이때 Confirm Email 을 다시 켠다
