# 아키텍처

이 저장소에 실제로 구현된 구조다. GitHub 에서 그대로 렌더링된다.

---

## 1. 전체 그림

핵심은 **데이터 접근이 전부 서버 쪽에 있다**는 것이다.
브라우저는 화면만 그리고, 수파베이스와는 한 번도 직접 말하지 않는다.

```mermaid
flowchart TB
    subgraph browser["브라우저"]
        UI["<b>Client Component</b><br/>auth-form · write-form<br/>delete-button<br/>― 폼 상태만 담당 ―"]
    end

    subgraph vercel["Vercel · Next.js 서버"]
        PROXY["<b>proxy.ts</b><br/>모든 요청이 지나간다<br/>토큰 갱신<br/>/write 접근 차단"]
        RSC["<b>Server Component</b><br/>목록 · 상세<br/>글쓰기 · 로그인<br/>― 화면을 그린다 ―"]
        ACT["<b>Server Action</b><br/>createPost · deletePost<br/>signIn · signUp · signOut<br/>― DB 를 건드린다 ―"]
        SBS["<b>lib/supabase/server.ts</b><br/>쿠키에서 세션을 읽는다"]
    end

    subgraph supabase["Supabase"]
        AUTH["<b>Auth</b><br/>JWT 발급 · 검증"]
        REST["PostgREST"]
        RLSCHK{"RLS 정책 3개"}
        DB[("PostgreSQL<br/>posts")]
    end

    UI -- "페이지 요청" --> PROXY
    UI -- "폼 제출" --> PROXY
    PROXY --> RSC
    PROXY --> ACT
    RSC --> SBS
    ACT --> SBS
    SBS -- "쿠키의 JWT 를<br/>Authorization 헤더에" --> REST
    SBS --> AUTH
    REST --> RLSCHK
    RLSCHK --> DB
```

> **브라우저에서 Supabase 로 가는 화살표가 없다.**
> 그래서 anon key 가 클라이언트 번들에 들어가지도 않는다
> (빌드 후 `.next/static` 을 뒤져도 0건). 다만 그게 방어선은 아니다 —
> anon key 는 원래 공개용이고, 진짜 방어선은 RLS 하나다.

---

## 2. 로그인 — 출입증은 쿠키에 산다

명세에 빠져 있던 부분이다. 토큰을 브라우저 `localStorage` 에 두면
서버가 그것을 볼 수 없고, 서버에서 `auth.uid()` 가 NULL 이 되어
RLS 정책 3개 중 2개가 항상 실패한다.

```mermaid
sequenceDiagram
    actor U as 사용자
    participant B as 브라우저 auth-form
    participant A as Server Action signIn
    participant S as Supabase Auth

    U->>B: 이메일 · 비밀번호 입력
    B->>A: 폼 제출
    A->>S: signInWithPassword()
    S-->>A: JWT (access + refresh)
    A-->>B: Set-Cookie
    Note over B: 이후 모든 요청에 쿠키가 자동으로 따라간다.<br/>브라우저가 보내든 서버가 중계하든 마찬가지다.
```

`proxy.ts` 가 매 요청마다 이 토큰을 갱신한다.
그래서 만료돼도 "브라우저는 로그인, 서버는 로그아웃" 같은 어긋남이 생기지 않는다.

---

## 3. 글쓰기 — RLS 가 판정하는 지점

```mermaid
sequenceDiagram
    participant B as 브라우저 write-form
    participant P as proxy.ts
    participant A as Server Action createPost
    participant D as PostgreSQL + RLS

    B->>P: 발행 (폼 제출 + 쿠키)
    P->>P: 토큰 갱신
    P->>A: 통과
    A->>D: insert into posts (title, content)
    Note over D: user_id 는 보내지 않는다.<br/>컬럼 default 가 auth.uid() 이고<br/>with check (auth.uid() = user_id) 가 다시 검사한다.

    alt 로그인 상태 · 본인 명의
        D-->>A: 1행 저장
        A-->>B: 글 상세 화면으로 이동
    else 비로그인 · 남의 명의
        D-->>A: 42501 거부
        A-->>B: 화면에 오류 표시
    end
```

---

## 4. 삭제 — 실패가 아니라 "0행"

여기가 가장 헷갈리는 지점이다. RLS 로 막힌 DELETE 는 **에러를 내지 않는다.**
`using` 조건에 맞지 않는 행은 애초에 그 사용자에게 보이지 않으므로,
"조건에 맞는 행이 없음" = 정상 종료 = 0행이 된다.

```mermaid
flowchart LR
    START["삭제 버튼"] --> ACT["Server Action<br/>deletePost"]
    ACT --> Q["delete from posts<br/>where id = ...<br/><b>.select()</b> 로 영향 행 수를 센다"]
    Q --> N{"몇 행?"}
    N -- "1행" --> OK["삭제 성공<br/>목록으로 이동"]
    N -- "0행" --> NO["'삭제할 권한이 없습니다'<br/>― 에러가 아니었다 ―"]
```

`.select()` 를 빼면 에러가 없으니 성공으로 착각하게 되고,
**아무것도 지우지 않고 '삭제되었습니다'라고 말하는 UI** 가 된다.

---

## 5. 파일과 역할

```mermaid
flowchart TB
    subgraph app["src/app"]
        L["layout.tsx<br/>헤더 · 폰트 · 테마"]
        P1["page.tsx<br/>/ 글 목록"]
        P2["posts/[id]/page.tsx<br/>글 상세 · 삭제"]
        P3["write/page.tsx<br/>write-form.tsx<br/>글쓰기"]
        P4["auth/page.tsx<br/>auth-form.tsx<br/>로그인 · 회원가입"]
        A1["actions/posts.ts"]
        A2["actions/auth.ts"]
    end

    subgraph lib["src/lib/supabase"]
        S1["server.ts<br/>서버용 · 쿠키 세션"]
        S2["session.ts<br/>proxy 의 갱신 로직"]
        S3["client.ts<br/>브라우저용<br/>보안 실험 전용"]
        S4["env.ts<br/>환경 변수 형식 검사"]
    end

    PX["src/proxy.ts"] --> S2
    S2 --> S4
    P1 --> S1
    P2 --> S1
    P3 --> A1
    P4 --> A2
    A1 --> S1
    A2 --> S1
    S1 --> S4
    L --> S1
```

`client.ts` 는 정상 경로에서 쓰지 않는다.
`docs/security-experiment.md` 의 06절 실험에서만 쓴다.

---

## 6. 명세와 달라진 곳

| 명세 (REV 0.1) | 이 구현 | 이유 |
| --- | --- | --- |
| `/write` 전체가 Client Component | 폼만 Client, DB 호출은 Server Action | 명세의 완료 기준과 충돌 |
| 세션 저장소 언급 없음 | 쿠키 (`@supabase/ssr`) + proxy | 없으면 서버에서 `auth.uid()` 가 NULL |
| 정책 3개 | 정책 3개 + 명시적 GRANT | 권한과 RLS 는 서로 다른 층 |

자세한 근거는 [`spec-review.md`](./spec-review.md).
