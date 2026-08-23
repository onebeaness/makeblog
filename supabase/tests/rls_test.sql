-- ---------------------------------------------------------------------------
-- RLS 정책이 "말한 대로" 동작하는지 검증한다.
-- 실행:  supabase/tests/run.sh
-- ---------------------------------------------------------------------------

\set ON_ERROR_STOP on

create schema if not exists t;

-- 주어진 SQL 이 성공해야 한다.
create or replace function t.ok(label text, stmt text) returns void
language plpgsql as $$
begin
  execute stmt;
  raise notice 'PASS  %', label;
exception when others then
  raise exception 'FAIL  % — 성공해야 하는데 % (%) 로 실패함', label, sqlstate, sqlerrm;
end $$;

-- 주어진 SQL 이 지정한 SQLSTATE 로 실패해야 한다.
create or replace function t.denied(label text, stmt text, expected text) returns void
language plpgsql as $$
begin
  execute stmt;
  raise exception 'FAIL  % — 막혔어야 하는데 성공함', label;
exception
  when others then
    if sqlerrm like 'FAIL %' then
      raise exception '%', sqlerrm;
    elsif sqlstate = expected then
      raise notice 'PASS  % (% 로 거부됨)', label, sqlstate;
    else
      raise exception 'FAIL  % — % 를 기대했는데 % (%)', label, expected, sqlstate, sqlerrm;
    end if;
end $$;

create or replace function t.eq(label text, got anyelement, want anyelement) returns void
language plpgsql as $$
begin
  if got is not distinct from want then
    raise notice 'PASS  % (= %)', label, got;
  else
    raise exception 'FAIL  % — 기대 %, 실제 %', label, want, got;
  end if;
end $$;

grant usage on schema t to anon, authenticated;
grant execute on all functions in schema t to anon, authenticated;

-- ---------------------------------------------------------------------------
begin;

-- 픽스처: 사용자 둘, 각자 글 하나. (superuser 로 삽입 → RLS 우회)
truncate auth.users cascade;
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com');
insert into public.posts (id, user_id, title, content) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'A의 글', '내용'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'B의 글', '내용');

\echo ''
\echo '### 비로그인(anon)'
reset role;
select set_config('request.jwt.claim.sub', '', true);
set local role anon;

select t.eq('anon 은 모든 글을 읽는다', (select count(*)::int from public.posts), 2);
select t.denied('anon 은 글을 쓸 수 없다',
  $$insert into public.posts (user_id, title) values ('11111111-1111-1111-1111-111111111111','x')$$,
  '42501');
select t.denied('anon 은 글을 지울 수 없다', $$delete from public.posts$$, '42501');

\echo ''
\echo '### 로그인 사용자 A'
reset role;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
set local role authenticated;

select t.eq('A 도 모든 글을 읽는다', (select count(*)::int from public.posts), 2);
select t.eq('auth.uid() 가 A 로 잡힌다', (select auth.uid()), '11111111-1111-1111-1111-111111111111'::uuid);
select t.ok('A 는 자기 명의로 글을 쓴다 (user_id 생략 → default auth.uid())',
  $$insert into public.posts (title, content) values ('A의 새 글','본문')$$);
select t.denied('A 는 B 명의로 글을 쓸 수 없다 (with check)',
  $$insert into public.posts (user_id, title) values ('22222222-2222-2222-2222-222222222222','도용')$$,
  '42501');
select t.denied('빈 제목은 저장되지 않는다 (check 제약)',
  $$insert into public.posts (title) values ('   ')$$, '23514');

\echo ''
\echo '### 삭제'
-- 남의 글 삭제는 "에러"가 아니라 "0건"이다. using 조건에 안 맞는 행은 보이지 않으므로.
create temp table del_other as
  with d as (delete from public.posts where id = 'bbbbbbbb-0000-0000-0000-000000000002' returning 1)
  select count(*)::int as n from d;
select t.eq('A 가 B 의 글을 지우면 0건 (에러 아님)', (select n from del_other), 0);

create temp table del_own as
  with d as (delete from public.posts where id = 'aaaaaaaa-0000-0000-0000-000000000001' returning 1)
  select count(*)::int as n from d;
select t.eq('A 가 자기 글을 지우면 1건', (select n from del_own), 1);

\echo ''
\echo '### 수정 (정책 없음 = 거부)'
select t.denied('자기 글이라도 수정할 수 없다',
  $$update public.posts set title = '고침' where user_id = auth.uid()$$, '42501');

\echo ''
\echo '### 토큰 없이 authenticated 롤만 있는 경우'
reset role;
select set_config('request.jwt.claim.sub', '', true);
set local role authenticated;
select t.eq('auth.uid() 는 NULL 이다', (select auth.uid()), null::uuid);
select t.denied('토큰 없는 authenticated 는 글을 쓸 수 없다',
  $$insert into public.posts (title) values ('무명')$$, '42501');

reset role;
rollback;
\echo ''
\echo '=== 모든 RLS 테스트 통과 ==='
