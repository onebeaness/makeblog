-- ---------------------------------------------------------------------------
-- 로컬 PostgreSQL에서 RLS 정책을 검증하기 위한 최소 수파베이스 흉내.
--
-- !! 수파베이스 대시보드에서 실행하지 말 것 !!
-- 아래 객체(auth 스키마, auth.users, auth.uid, anon/authenticated 롤)는
-- 실제 수파베이스 프로젝트에는 이미 존재한다.
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique
);

-- 수파베이스의 auth.uid() 와 동일한 구현.
-- JWT 의 sub 클레임을 세션 설정에서 읽는다. 없으면 NULL.
create or replace function auth.uid() returns uuid
  language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;

grant usage on schema public to anon, authenticated;
grant usage on schema auth   to anon, authenticated;
