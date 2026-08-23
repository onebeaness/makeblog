# 보안 실험 — 명세 06절

목적은 기능 개발이 아니라 **관찰**이다. 순서를 그대로 따른다.

## 0. 실험 전 커밋

```bash
git commit -am "실험 전 백업"
```

되돌릴 지점을 만들어 두는 것이 1단계다.

## 1. 지금 상태 확인 (서버에서 읽는 경우)

```bash
npm run dev
```

브라우저 → 개발자도구 → **Network** 탭 → `/` 새로고침.

`supabase.co` 로 나가는 요청이 **없다.** 데이터는 서버가 이미 읽어서 HTML 에
박아 보냈기 때문이다. 브라우저는 결과만 받는다.

## 2. 클라이언트에서 읽도록 바꾼다

`src/app/page.tsx` 를 통째로 아래로 바꾼다.

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  const [posts, setPosts] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    const supabase = createClient();
    // 일부러 select("*") 를 쓴다. 화면에 안 쓰는 열까지 딸려 오는 걸 보기 위해서다.
    supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setPosts(data ?? []));
  }, []);

  return (
    <ul>
      {posts.map((p) => (
        <li key={String(p.id)}>{String(p.title)}</li>
      ))}
    </ul>
  );
}
```

## 3. 다시 Network 탭

이번에는 `.../rest/v1/posts?select=*&order=created_at.desc` 요청이 보인다.
세 가지를 확인한다.

| 볼 것 | 어디서 | 무엇을 알 수 있나 |
| --- | --- | --- |
| 요청 URL | Headers | 우리 DB 의 테이블 이름과 쿼리가 그대로 드러난다 |
| `apikey` 헤더 | Headers | anon key 가 브라우저에 있다 |
| 응답 본문 | Response | 화면에 안 쓰는 `user_id`, `content` 까지 전부 들어 있다 |

## 4. 결론 — 이 실험이 말하는 것

- **UI 에 버튼이 없다는 것은 막혀 있다는 뜻이 아니다.**
  anon key 와 URL 을 손에 넣은 사람은 우리 화면을 거치지 않고
  `curl` 로 같은 요청을 보낼 수 있다. 실제 방어선은 오직 RLS 정책뿐이다.

- **RLS 는 행 단위이지 열 단위가 아니다.**
  한 행의 조회를 허용하면 그 행의 모든 열이 함께 나간다.
  숨겨야 할 값과 공개할 값을 같은 테이블에 두면 안 되는 이유다.
  (열 단위로 막고 싶다면 `grant select (col1, col2)` 로 컬럼 권한을 주거나,
  민감한 열을 별도 테이블로 분리한다.)

- **프런트엔드에서 걸러 보여주는 것은 필터이지 차단이 아니다.**
  `select("*")` 대신 필요한 열만 고르는 습관은 그래서 성능 문제가 아니라
  노출 면적 문제다.

## 5. 되돌리기

```bash
git checkout -- src/app/page.tsx
```

Network 탭에 다시 요청이 사라지는지 확인한다.

---

## 덧: 이 저장소의 기본 상태는 명세보다 한 발 더 나가 있다

명세 06절은 "anon key 는 브라우저에 노출되어 있다"를 전제한다.
그런데 이 구현은 데이터 접근을 전부 서버(Server Component + Server Action)에서
하므로, **anon key 가 클라이언트 번들에 들어가지도 않는다.** 확인해 보자.

```bash
npm run build
grep -rl "$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2)" .next/static | wc -l
# → 0
```

그렇다고 안전해진 것은 아니다. anon key 는 애초에 **공개용 키**다.
프로젝트 설정 화면에 그대로 적혀 있고, 클라이언트 앱을 하나라도 만들면 다시 나간다.
번들에 없다는 것은 "덜 눈에 띈다"일 뿐, **방어선은 여전히 RLS 하나다.**
