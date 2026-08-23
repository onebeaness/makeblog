-- ---------------------------------------------------------------------------
-- 시드 데이터. 3단계("읽기")에서 목록 화면을 확인하기 위한 것.
--
-- 먼저 앱에서 회원가입을 한 번 해야 한다. auth.users 에 사용자가 없으면
-- user_id 외래키를 채울 수 없기 때문이다.
-- 수파베이스 SQL Editor 에 붙여넣고 실행한다.
-- ---------------------------------------------------------------------------

insert into public.posts (user_id, title, content)
select u.id, v.title, v.content
from (select id from auth.users order by created_at limit 1) u
cross join (values
  ('RLS를 처음 만났을 때',
   E'글쓰기 버튼을 눌렀더니 이런 오류가 났다.\n\n  new row violates row-level security policy for table "posts"\n\n조회는 되는데 삽입만 막힌다는 건, 읽기 정책은 있고 쓰기 정책은 없다는 뜻이었다.\nusing 은 이미 있는 행을 보여줄지 판단하고, with check 는 새로 들어올 값이\n규칙에 맞는지 판단한다. 나는 앞의 것만 만들어 놓고 뒤의 것을 잊고 있었다.'),
  ('엔드포인트라는 이름의 유래',
   E'endpoint 는 말 그대로 "끝점"이다.\n무엇의 끝인가 하면, 클라이언트가 서버에 말을 거는 통로의 끝이다.\n\n주소가 공개되어 있다는 것과 그 안의 데이터가 공개되어 있다는 것은 다르다.\n문 앞에 주소가 붙어 있다고 해서 문이 열려 있는 것은 아니니까.')
) as v(title, content)
where exists (select 1 from auth.users);
