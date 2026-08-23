-- ---------------------------------------------------------------------------
-- 0001_posts.sql — 그레이스케일 개발자 블로그 MVP
--
-- 테이블 1개(posts), 정책 3개(SELECT / INSERT / DELETE).
-- UPDATE 정책은 "일부러" 없다. RLS가 켜진 테이블에서 정책이 없는 작업은
-- 거부가 기본값이므로, 글 수정은 DB 차원에서 막힌다. (MVP 범위 밖)
-- ---------------------------------------------------------------------------

create table if not exists public.posts (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid()
                         references auth.users (id) on delete cascade,
  title      text        not null,
  content    text        not null default '',
  created_at timestamptz not null default now(),

  -- 빈 제목 금지. 공백만 입력한 경우도 막는다.
  constraint posts_title_not_blank check (char_length(btrim(title)) between 1 and 200),
  constraint posts_content_len     check (char_length(content) <= 20000)
);

-- 목록은 항상 최신순. 정렬 컬럼에 인덱스를 준다.
create index if not exists posts_created_at_idx on public.posts (created_at desc);
-- "내 글만" 류의 조회와 RLS 검사에 쓰인다.
create index if not exists posts_user_id_idx     on public.posts (user_id);

-- ---------------------------------------------------------------------------
-- RLS. 이 한 줄이 빠지면 아래 정책은 전부 장식이다.
-- ---------------------------------------------------------------------------
alter table public.posts enable row level security;

-- 테이블 소유자(postgres)는 기본적으로 RLS를 우회한다. 소유자로 접속하는
-- 경로가 생기더라도 정책이 적용되도록 강제해 둔다.
alter table public.posts force row level security;

-- 1) 읽기: 누구나. 로그인하지 않아도 글 목록과 상세를 볼 수 있다.
drop policy if exists "posts_select_public" on public.posts;
create policy "posts_select_public"
  on public.posts
  for select
  to anon, authenticated
  using (true);

-- 2) 쓰기: 로그인한 사람이, 자기 명의로만.
--    with check 는 "새로 들어올 행"을 검사한다.
--    user_id 의 default 가 auth.uid() 이므로 클라이언트는 user_id 를
--    보내지 않아도 되고, 남의 id 를 보내면 여기서 걸린다.
drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own"
  on public.posts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 3) 삭제: 작성자 본인만.
--    using 은 "이미 있는 행"을 검사한다. 조건에 맞지 않는 행은
--    애초에 보이지 않으므로, 남의 글 삭제는 에러가 아니라 0건 삭제가 된다.
drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own"
  on public.posts
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- UPDATE 정책 없음 → 아무도 수정할 수 없다. 의도된 상태다.

-- ---------------------------------------------------------------------------
-- 권한(GRANT)은 RLS와 다른 층이다.
--   GRANT = "이 롤이 이 작업을 시도라도 할 수 있는가" (테이블 단위)
--   RLS   = "그 중 어떤 행에 대해 허용되는가"          (행 단위)
-- 수파베이스는 public 스키마 신규 테이블에 기본 권한을 자동으로 부여하지만,
-- 여기서는 필요한 것만 명시적으로 준다. UPDATE 권한은 주지 않는다.
-- ---------------------------------------------------------------------------
revoke all on table public.posts from anon, authenticated;
grant select                 on table public.posts to anon, authenticated;
grant insert, delete         on table public.posts to authenticated;
