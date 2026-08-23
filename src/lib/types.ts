export type Post = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
};

/** 목록에는 본문이 필요 없다. 필요한 열만 골라 받는다. */
export type PostSummary = Pick<Post, "id" | "title" | "created_at" | "user_id">;
