-- 한 번 누르는 가벼운 반응. 전문가 진단(feedback)보다 훨씬 많이 모여서 체감 품질을 본다. 사진·질문 글은 없다

-- 결과 화면 "이 결과, 내 생각과 비슷해요?"
create table if not exists result_reactions (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  verdict text not null check (verdict in ('agree', 'unsure', 'disagree')),
  predicted text not null,
  reference text not null check (reference in ('white', 'locked', 'teeth', 'sclera', 'scene', 'none')),
  source text not null check (source in ('camera', 'image')),
  shots smallint not null,
  calibration text not null
);

-- AI 상담 답 하나에 대한 "도움이 됐어요 / 아쉬워요"
create table if not exists advisor_ratings (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  helpful boolean not null,
  -- ai: 모델이 답함, search: 한도·장애로 검색만으로 답함
  mode text not null check (mode in ('ai', 'search')),
  -- 답에 붙은 제품 카드 id(최대 3개)
  products text[] not null default '{}'
);
