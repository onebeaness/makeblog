#!/usr/bin/env bash
# 로컬 PostgreSQL 에 스키마를 올리고 RLS 정책을 검증한다.
# 수파베이스 없이, 순수 PostgreSQL 만으로 돈다.
#
#   PGHOST / PGPORT / PGUSER 로 접속 대상을 바꿀 수 있다.
#   기본값: 로컬 소켓, 5432, postgres
set -euo pipefail

DB="${PGDATABASE:-blog_rls_test}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$(dirname "$HERE")")"
PSQL=(psql -v ON_ERROR_STOP=1 -q -U "${PGUSER:-postgres}")

"${PSQL[@]}" -d postgres -c "drop database if exists \"$DB\";" -c "create database \"$DB\";"
"${PSQL[@]}" -d "$DB" -f "$HERE/00_local_shim.sql"
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/migrations/0001_posts.sql"
psql -v ON_ERROR_STOP=1 -U "${PGUSER:-postgres}" -d "$DB" -f "$HERE/rls_test.sql"
