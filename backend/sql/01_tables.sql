-- ===========================================================================
--  포트폴리오 DB — 테이블 만들기 (1/2)
--
--  실행 방법: Supabase 화면 -> 왼쪽 SQL Editor -> 이 파일 전체를 붙여넣고 Run
--  이 파일은 "표(테이블)를 만드는" 일만 합니다.
--  누가 무엇을 볼 수 있는지(공개/비공개)는 02_security.sql에서 정합니다.
--
--  각 컬럼 옆의 표시:
--    [공개] 사이트 방문자 누구나 볼 수 있어야 하는 값
--    [비공개] 관리자만 볼 수 있어야 하는 값
--    (id, 외래키처럼 표를 잇는 '구조용' 칸은 따로 표시하지 않았습니다)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- A. 포트폴리오 전시
-- ---------------------------------------------------------------------------

create table if not exists project_categories (
  id            bigint generated always as identity primary key,
  key           text not null unique,              -- [공개] 'campus', 'web' ...
  label_ko      text not null,                     -- [공개] '캠퍼스 개발'
  display_order int  not null default 0            -- [비공개] 정렬에만 사용
);

create table if not exists projects (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,              -- [공개] 주소에 쓰는 이름
  title         text not null,                     -- [공개]
  summary       text,                              -- [공개] 카드에 보이는 한 줄
  description   text,                              -- [공개] 모달 상세 설명
  category_id   bigint references project_categories(id) on delete set null,  -- [공개]
  started_on    date,                              -- [공개]
  team_size     int,                               -- [공개]
  award         text,                              -- [공개] 수상 내역
  status        text not null default 'draft'
                check (status in ('draft', 'published')),  -- [비공개] 공개 여부 판단에만 사용
  notes         text,                              -- [비공개] 나만 보는 메모
  display_order int  not null default 0,           -- [비공개] 정렬에만 사용
  created_at    timestamptz not null default now(),-- [비공개]
  updated_at    timestamptz not null default now() -- [비공개]
);

-- 기능 불릿 / 링크 / 이미지는 프로젝트마다 개수가 달라서 따로 둡니다.
-- (feature1, feature2 ... 컬럼으로 두면 5번째가 생길 때 표를 고쳐야 합니다)

create table if not exists project_features (
  id            bigint generated always as identity primary key,
  project_id    uuid not null references projects(id) on delete cascade,
  content       text not null,                     -- [공개]
  display_order int  not null default 0            -- [비공개]
);

create table if not exists project_links (
  id            bigint generated always as identity primary key,
  project_id    uuid not null references projects(id) on delete cascade,
  kind          text not null,                     -- [공개] 'github' | 'demo' | 'article'
  url           text not null,                     -- [공개]
  label         text,                              -- [공개]
  display_order int  not null default 0            -- [비공개]
);

create table if not exists project_images (
  id            bigint generated always as identity primary key,
  project_id    uuid not null references projects(id) on delete cascade,
  storage_path  text not null,                     -- [공개] Supabase Storage 안의 경로
  alt_text      text,                              -- [공개]
  is_cover      boolean not null default false,    -- [공개]
  display_order int  not null default 0            -- [비공개]
);

-- 태그: 'React'처럼 여러 프로젝트가 같이 쓰는 값이라 따로 모아둡니다.
--   ※ 태그로 검색할 계획이 전혀 없다면, 아래 두 표를 지우고
--     projects 에 `tags text[]` 컬럼 하나만 두는 방법이 훨씬 간단합니다.
create table if not exists tags (
  id   bigint generated always as identity primary key,
  name text not null unique                        -- [공개]
);

create table if not exists project_tags (
  project_id uuid   not null references projects(id) on delete cascade,
  tag_id     bigint not null references tags(id)   on delete cascade,
  primary key (project_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- B. 이력 · 역량
-- ---------------------------------------------------------------------------

create table if not exists skill_categories (
  id            bigint generated always as identity primary key,
  key           text not null unique,              -- [공개] 'FRONTEND' ...
  label         text not null,                     -- [공개]
  display_order int  not null default 0            -- [비공개]
);

create table if not exists skills (
  id            bigint generated always as identity primary key,
  category_id   bigint not null references skill_categories(id) on delete cascade,
  name          text not null,                     -- [공개] 'React / Next.js'
  level         int  not null check (level between 0 and 100),  -- [공개] 막대 %
  is_public     boolean not null default true,     -- [비공개] 이 항목을 숨길지
  display_order int  not null default 0            -- [비공개]
);

create table if not exists timeline_entries (
  id            bigint generated always as identity primary key,
  period_label  text not null,                     -- [공개] '2024 - PRESENT'
  title         text not null,                     -- [공개]
  role          text,                              -- [공개]
  description   text,                              -- [공개]
  started_on    date,                              -- [비공개] 정렬용
  ended_on      date,                              -- [비공개]
  is_public     boolean not null default true,     -- [비공개]
  display_order int  not null default 0            -- [비공개]
);

-- ---------------------------------------------------------------------------
-- C. 방문 예약  ← 개인정보가 들어가는 표. 공개/비공개 구분이 가장 중요합니다.
-- ---------------------------------------------------------------------------

create table if not exists reservations (
  id                uuid primary key default gen_random_uuid(),  -- [비공개]
  reservation_no    text not null,                 -- [비공개] 본인에게 메일로만 알림
  visit_date        date not null,                 -- [공개] 자리가 찼는지 알려줘야 함
  visit_time        time not null,                 -- [공개] 〃
  name              text not null,                 -- [비공개] ★ 절대 공개 금지
  email             text not null,                 -- [비공개] ★ 절대 공개 금지
  purpose           text not null,                 -- [비공개] ★ 절대 공개 금지
  status            text not null default 'received'
                    check (status in ('received','confirmed','change_requested','cancelled')),
                                                   -- [비공개] 공개 뷰에서는 조건으로만 사용
  consent_at        timestamptz,                   -- [비공개] 개인정보 동의 시각(증빙)
  created_at        timestamptz not null default now(),       -- [비공개]
  status_updated_at timestamptz                    -- [비공개]
);

-- ★ 같은 날짜·시간에 살아있는 예약은 하나만 존재할 수 있다.
--   지금은 JS 코드로 막고 있는데, 이 인덱스를 걸면 DB가 직접 막아줍니다.
--   취소/변경 요청은 조건에서 빠지므로 그 자리는 자동으로 다시 열립니다.
create unique index if not exists uniq_active_reservation_slot
  on reservations (visit_date, visit_time)
  where status in ('received', 'confirmed');

create table if not exists reservation_status_logs (
  id             bigint generated always as identity primary key,
  reservation_id uuid not null references reservations(id) on delete cascade,
  from_status    text,                             -- [비공개] 전부 관리자용
  to_status      text not null,                    -- [비공개]
  note           text,                             -- [비공개]
  changed_at     timestamptz not null default now()-- [비공개]
);

create table if not exists holidays (
  holiday_date date primary key,                   -- [공개] 예약 불가일
  name         text not null                       -- [공개] '한글날'
);

create table if not exists reservation_time_slots (
  id            bigint generated always as identity primary key,
  start_time    time not null unique,              -- [공개] 13:00, 13:30 ...
  is_active     boolean not null default true,     -- [공개] 꺼두면 목록에서 사라짐
  display_order int not null default 0             -- [비공개]
);

-- ---------------------------------------------------------------------------
-- D. 문의 · 사이트 설정
-- ---------------------------------------------------------------------------

create table if not exists contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,                        -- [비공개] ★ 전부 비공개
  email      text not null,                        -- [비공개]
  subject    text,                                 -- [비공개]
  message    text not null,                        -- [비공개]
  is_read    boolean not null default false,       -- [비공개]
  created_at timestamptz not null default now()    -- [비공개]
);

create table if not exists site_profile (
  id                 int primary key default 1 check (id = 1),  -- 항상 한 줄만
  name               text,                         -- [공개]
  headline           text,                         -- [공개]
  bio                text,                         -- [공개]
  profile_image_path text,                         -- [공개]
  email              text,                         -- [공개] 이미 사이트에 노출 중
  github_url         text,                         -- [공개]
  blog_url           text,                         -- [공개]
  updated_at         timestamptz not null default now()  -- [비공개]
);

create table if not exists visit_location (
  id       int primary key default 1 check (id = 1),
  label    text,                                   -- [공개] '상명대학교 천안캠퍼스 B306'
  address  text,                                   -- [공개]
  lat      double precision,                       -- [공개]
  lng      double precision,                       -- [공개]
  map_zoom int default 17                          -- [공개]
);
