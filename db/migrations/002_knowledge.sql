-- 뷰티 상담(RAG·에이전트)이 찾아 쓰는 지식. 임베딩은 Gemini 768차원
create extension if not exists vector;

-- 제품: 색으로 거르고(SQL), 설명으로 찾는다(벡터)
create table if not exists products (
  id text primary key,
  category text not null check (category in ('lip', 'blush')),
  brand text not null,
  name text not null,
  shade text not null,
  hex text not null,
  lab_l real not null,
  lab_a real not null,
  lab_b real not null,
  finish text not null,
  seasons text[] not null,
  price_tier text not null check (price_tier in ('under20k', '20k-40k', 'over40k')),
  description text not null,
  -- 설명이 바뀌었을 때만 임베딩을 다시 만든다
  content_hash text not null,
  embedding vector(768)
);

-- 퍼스널 컬러 가이드 문서 조각
create table if not exists guides (
  id text primary key,
  title text not null,
  seasons text[] not null,
  content text not null,
  content_hash text not null,
  embedding vector(768)
);

-- 수백 건 규모라 정확 검색(순차 스캔)으로 충분하다. 수만 건이 넘으면 hnsw 인덱스를 단다

-- AI 상담 하루 호출 수. 무료 등급 한도 안에서 쓰고, 넘으면 검색만으로 답한다(질문 내용은 남기지 않는다)
create table if not exists advisor_usage (
  day date primary key,
  calls integer not null default 0
);
