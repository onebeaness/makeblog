export type Review = {
  id: string;
  content: string;
  rating: number;
  author: string;
  created_at: string;
};

/** 답변 아래 "참고한 리뷰"로 뿌릴 항목. */
export type Source = {
  id: string;
  content: string;
  rating: number;
  /** 유사도 점수. 검색이 왜 이 리뷰를 골랐는지 화면에서 확인하려고 그대로 내려보낸다. */
  score: number;
};

export type ChatResponse = { answer: string; sources: Source[] };
