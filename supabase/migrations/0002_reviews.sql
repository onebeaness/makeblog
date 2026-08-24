-- ---------------------------------------------------------------------------
-- 0002_reviews.sql — 리뷰 챗봇 (챕터 10)
--
-- 리뷰 "원문"이 사는 곳. 벡터(좌표)는 Pinecone 에 따로 산다.
-- 같은 리뷰가 양쪽에 있고, id 로 짝을 맞춘다.
--
--   수파베이스 : 사람이 읽을 원문        → 출처 카드에 뿌린다
--   Pinecone   : 기계가 검색할 1024차원 좌표 → 유사도 검색
--
-- 로그인이 없으므로 정책은 조회 하나뿐이다.
-- 쓰기 정책을 만들지 않는다 = 브라우저에서는 아무도 못 쓴다.
-- 인덱싱은 서버 라우트(/api/index)에서만 일어난다.
-- ---------------------------------------------------------------------------

create table if not exists public.reviews (
  id         text        primary key,          -- CSV 의 리뷰 ID 를 그대로 쓴다 (r001 …)
  content    text        not null,
  rating     smallint    not null,
  author     text        not null default '',
  created_at date        not null default current_date,

  constraint reviews_content_not_blank check (char_length(btrim(content)) between 1 and 5000),
  constraint reviews_rating_range      check (rating between 1 and 5)
);

create index if not exists reviews_rating_idx on public.reviews (rating);

alter table public.reviews enable row level security;
alter table public.reviews force row level security;

-- 조회만 허용. 챕터 09 의 posts 와 달리 INSERT/DELETE 정책이 아예 없다.
-- 정책이 없는 작업은 거부가 기본값이므로, 이 테이블은 읽기 전용이 된다.
drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public"
  on public.reviews
  for select
  to anon, authenticated
  using (true);

revoke all on table public.reviews from anon, authenticated;
grant select on table public.reviews to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 그럼 인덱싱은 어떻게 넣나?
--
-- /api/index 라우트도 anon key 를 쓰므로 이 정책 아래에서는 INSERT 가 막힌다.
-- 두 가지 길이 있다.
--
--   (A) 이 파일 아래 seed 를 SQL Editor 에서 직접 실행한다.  ← 이 프로젝트의 선택
--       사람이 대시보드에서 실행하는 것은 RLS 를 우회한다(postgres 롤).
--   (B) service_role 키를 서버에 두고 그 키로 넣는다.
--       RLS 를 통째로 우회하는 키라서 이 저장소에는 두지 않는다.
--
-- (A) 를 고른 이유: 리뷰는 한 번 넣고 끝인 정적 데이터다. 그것 때문에
-- 만능 키를 서버에 두는 것은 위험 대비 이득이 없다.
-- samples/reviews.csv 를 넣는 SQL 은 supabase/seed_reviews.sql 에 있다.
-- ---------------------------------------------------------------------------
