-- 이용자가 동의하고 보낸 전문가 진단 결과. 사진·기기·사람을 알아볼 수 있는 값은 없다
create table if not exists feedback (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  -- 전문가 진단
  expert_season text not null check (expert_season in ('spring', 'summer', 'autumn', 'winter')),
  expert_subtype text check (expert_subtype in ('light', 'bright', 'true', 'soft', 'deep')),
  -- 톤픽이 낸 판정과 그 근거
  predicted text not null,
  lab_l real not null,
  lab_a real not null,
  lab_b real not null,
  hue real not null,
  ita real not null,
  shots smallint not null,
  source text not null check (source in ('camera', 'image')),
  corrected boolean not null,
  -- 조명 보정에 쓴 기준: white(직접 찍은 흰색) · locked(흰 종이로 카메라 고정) · teeth · sclera · scene(배경 절반) · none
  reference text not null check (reference in ('white', 'locked', 'teeth', 'sclera', 'scene', 'none')),
  -- 판정할 때 쓴 기준값 버전(calibration.json)
  calibration text not null
);

create index if not exists feedback_created_at on feedback (created_at);

-- 기준값 재보정 실행 기록. GitHub Actions가 매주 남긴다
create table if not exists calibration_runs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  n integer not null,
  current_version text not null,
  current_accuracy real,
  cv_accuracy real,
  params jsonb not null,
  applied boolean not null,
  reason text not null
);
