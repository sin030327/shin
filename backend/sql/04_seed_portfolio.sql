-- ===========================================================================
--  포트폴리오 DB — 화면에 박혀 있던 내용 옮겨 담기 (4/4)
--
--  실행 방법: Supabase -> SQL Editor -> New query -> 전체 붙여넣고 Run
--  (01 ~ 03 을 먼저 실행한 뒤에 돌려야 합니다)
--
--  무엇이 들어가나요?
--    프로젝트 6건, 스킬 12개, 이력 2건
--  이 파일은 index.html 과 script.js 에서 자동으로 뽑아 만든 것이라
--  지금 화면에 보이는 내용과 글자 하나까지 같습니다.
--
--  ★ 여러 번 실행해도 안전합니다.
--    프로젝트는 slug(고유 이름)를 기준으로 "있으면 덮어쓰기"로 동작합니다.
--    단, 스킬과 이력은 전부 지우고 다시 넣습니다. Supabase에서 직접 고치신
--    내용이 있다면 이 파일을 다시 돌릴 때 사라지니 주의하세요.
--
--  ※ 날짜(started_on)와 참여인원(team_size)은 원래 화면에 없던 정보라
--    비워 두었습니다. 관리자 화면에서 채우시면 됩니다.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. 프로젝트 분류 (화면의 필터 버튼)
-- ---------------------------------------------------------------------------
insert into project_categories (key, label_ko, display_order) values ('campus', '캠퍼스 개발', 1)
  on conflict (key) do update set label_ko = excluded.label_ko, display_order = excluded.display_order;
insert into project_categories (key, label_ko, display_order) values ('web', '웹 애플리케이션', 2)
  on conflict (key) do update set label_ko = excluded.label_ko, display_order = excluded.display_order;
insert into project_categories (key, label_ko, display_order) values ('study', '학습 도구', 3)
  on conflict (key) do update set label_ko = excluded.label_ko, display_order = excluded.display_order;
insert into project_categories (key, label_ko, display_order) values ('landscape', '조경 설계', 4)
  on conflict (key) do update set label_ko = excluded.label_ko, display_order = excluded.display_order;

-- ---------------------------------------------------------------------------
-- 2. 프로젝트 6건
-- ---------------------------------------------------------------------------
-- [1] 상명대 스터디룸 예약 및 캘린더 플랫폼
insert into projects (slug, title, summary, description, category_id, award, status, display_order)
values (
  'studyroom-reservation-platform',
  '상명대 스터디룸 예약 및 캘린더 플랫폼',
  '학생들의 교내 스터디룸 및 빈 강의실 예약 편의를 위해 개발된 실시간 타임테이블 예약 시스템입니다.',
  '상명대학교 학생들의 팀 프로젝트 및 동아리 스터디 모임을 원활하게 지원하기 위해 개발한 실시간 예약 플랫폼입니다. 학내 빈 강의실과 스터디룸 현황을 확인하고 중복 예약 없이 손쉽게 예약할 수 있도록 구현했습니다.',
  (select id from project_categories where key = 'campus'),
  null,
  'published',
  1
)
on conflict (slug) do update set
  title = excluded.title, summary = excluded.summary, description = excluded.description,
  category_id = excluded.category_id, award = excluded.award,
  status = excluded.status, display_order = excluded.display_order, updated_at = now();

-- [2] 알고리즘 풀이 & 개발 지식 아카이빙 블로그
insert into projects (slug, title, summary, description, category_id, award, status, display_order)
values (
  'dev-archive-blog',
  '알고리즘 풀이 & 개발 지식 아카이빙 블로그',
  '마크다운 문법을 실시간 파싱하여 복잡한 알고리즘 풀이와 웹 기술 트러블슈팅을 체계적으로 축적하는 개인 블로그입니다.',
  '자료구조, 알고리즘 풀이 및 전공 수업에서 배운 핵심 웹 기술들을 체계적으로 아카이빙하고 복습하기 위해 직접 구축한 개인 기술 블로그 플랫폼입니다.',
  (select id from project_categories where key = 'web'),
  null,
  'published',
  2
)
on conflict (slug) do update set
  title = excluded.title, summary = excluded.summary, description = excluded.description,
  category_id = excluded.category_id, award = excluded.award,
  status = excluded.status, display_order = excluded.display_order, updated_at = now();

-- [3] 전공 강의 핵심 요약 및 퀴즈 생성 어시스턴트
insert into projects (slug, title, summary, description, category_id, award, status, display_order)
values (
  'lecture-quiz-assistant',
  '전공 강의 핵심 요약 및 퀴즈 생성 어시스턴트',
  '방대한 전공 시험 범위를 단시간에 복습할 수 있도록 핵심 용어를 추출하고 실시간 4지선다 퀴즈를 생성하는 학습 툴입니다.',
  '방대한 양의 전공 시험 범위를 효율적으로 복습할 수 있도록 강의 텍스트에서 주요 용어를 추출하고 맞춤형 4지선다 퀴즈를 생성해주는 학습 보조 웹 도구입니다.',
  (select id from project_categories where key = 'study'),
  null,
  'published',
  3
)
on conflict (slug) do update set
  title = excluded.title, summary = excluded.summary, description = excluded.description,
  category_id = excluded.category_id, award = excluded.award,
  status = excluded.status, display_order = excluded.display_order, updated_at = now();

-- [4] 몰입형 집중 타이머 & 칸반 할 일 관리 보드
insert into projects (slug, title, summary, description, category_id, award, status, display_order)
values (
  'focus-timer-kanban',
  '몰입형 집중 타이머 & 칸반 할 일 관리 보드',
  '뽀모도로 집중 기법과 드래그 앤 드롭 칸반을 결합하여 코딩 작업 및 공부 루틴을 체계적으로 관리하는 생산성 도구입니다.',
  '일일 공부 계획과 개발 작업의 몰입도를 극대화하기 위해 뽀모도로(Pomodoro) 기법 타이머와 드래그 앤 드롭 방식의 칸반 보드를 결합한 웹 애플리케이션입니다.',
  (select id from project_categories where key = 'web'),
  null,
  'published',
  4
)
on conflict (slug) do update set
  title = excluded.title, summary = excluded.summary, description = excluded.description,
  category_id = excluded.category_id, award = excluded.award,
  status = excluded.status, display_order = excluded.display_order, updated_at = now();

-- [5] 습지를 담은 숲 — 도시숲 설계 공모전
insert into projects (slug, title, summary, description, category_id, award, status, display_order)
values (
  'urban-forest-wetland',
  '습지를 담은 숲 — 도시숲 설계 공모전',
  '서울 용산구 이촌동, 용산공원과 한강 사이에서 끊어진 생태축을 회복하는 도시숲 설계 공모전 출품작입니다. 팀 프로젝트로 참여해 마스터플랜 제작을 맡았습니다.',
  '서울 용산구 이촌동, 용산공원과 한강 사이에서 끊어진 생태축을 회복하는 도시숲 설계 공모전 출품작입니다. 팀 프로젝트로 참여해 마스터플랜 제작을 맡았습니다.',
  (select id from project_categories where key = 'landscape'),
  null,
  'published',
  5
)
on conflict (slug) do update set
  title = excluded.title, summary = excluded.summary, description = excluded.description,
  category_id = excluded.category_id, award = excluded.award,
  status = excluded.status, display_order = excluded.display_order, updated_at = now();

-- [6] 청도서원(淸道書院)
insert into projects (slug, title, summary, description, category_id, award, status, display_order)
values (
  'cheongdo-seowon',
  '청도서원(淸道書院)',
  '서울 노들섬을 대상지로, 유상곡수·화계 등 전통 조경 기법을 접목한 정원을 설계한 대한민국 전통조경대전(제2회) 출품작입니다. 팀 프로젝트로 참여해 마스터플랜 제작을 맡았습니다.',
  '서울 노들섬을 대상지로, 유상곡수(流觴曲水)·화계(花階) 등 전통 조경 기법을 접목한 정원을 설계한 대한민국 전통조경대전(제2회) 출품작 "청도서원"입니다. 팀 프로젝트로 참여해 마스터플랜 제작을 맡았으며, 장려상을 수상했습니다.',
  (select id from project_categories where key = 'landscape'),
  '장려상 · 대한민국 전통조경대전 제2회',
  'published',
  6
)
on conflict (slug) do update set
  title = excluded.title, summary = excluded.summary, description = excluded.description,
  category_id = excluded.category_id, award = excluded.award,
  status = excluded.status, display_order = excluded.display_order, updated_at = now();

-- ---------------------------------------------------------------------------
-- 3. 프로젝트에 딸린 자료는 다시 넣기 전에 비운다
--    (여기서 지우는 건 위 6건에 딸린 것뿐입니다)
-- ---------------------------------------------------------------------------
delete from project_features where project_id in (select id from projects where slug in ('studyroom-reservation-platform', 'dev-archive-blog', 'lecture-quiz-assistant', 'focus-timer-kanban', 'urban-forest-wetland', 'cheongdo-seowon'));
delete from project_links where project_id in (select id from projects where slug in ('studyroom-reservation-platform', 'dev-archive-blog', 'lecture-quiz-assistant', 'focus-timer-kanban', 'urban-forest-wetland', 'cheongdo-seowon'));
delete from project_images where project_id in (select id from projects where slug in ('studyroom-reservation-platform', 'dev-archive-blog', 'lecture-quiz-assistant', 'focus-timer-kanban', 'urban-forest-wetland', 'cheongdo-seowon'));
delete from project_tags where project_id in (select id from projects where slug in ('studyroom-reservation-platform', 'dev-archive-blog', 'lecture-quiz-assistant', 'focus-timer-kanban', 'urban-forest-wetland', 'cheongdo-seowon'));

-- ---------------------------------------------------------------------------
-- 4. 주요 기능
-- ---------------------------------------------------------------------------
insert into project_features (project_id, content, display_order)
  select id, 'React 기반의 시각적 타임테이블 및 캘린더 인터페이스 구현', 1 from projects where slug = 'studyroom-reservation-platform';
insert into project_features (project_id, content, display_order)
  select id, 'Node.js / Express를 이용한 RESTful API 엔드포인트 구축', 2 from projects where slug = 'studyroom-reservation-platform';
insert into project_features (project_id, content, display_order)
  select id, '동시성 예약 충돌을 방지하기 위한 MySQL 트랜잭션 격리 수준 적용', 3 from projects where slug = 'studyroom-reservation-platform';
insert into project_features (project_id, content, display_order)
  select id, '모바일 최적화 반응형 레이아웃 설계', 4 from projects where slug = 'studyroom-reservation-platform';
insert into project_features (project_id, content, display_order)
  select id, '마크다운(Markdown) 실시간 파싱 및 코드 신택스 하이라이팅 연동', 1 from projects where slug = 'dev-archive-blog';
insert into project_features (project_id, content, display_order)
  select id, '카테고리별/태그별 아티클 검색 및 필터링 기능', 2 from projects where slug = 'dev-archive-blog';
insert into project_features (project_id, content, display_order)
  select id, '브라우저 LocalStorage 기반 임시 저장 및 테마 설정 지속화', 3 from projects where slug = 'dev-archive-blog';
insert into project_features (project_id, content, display_order)
  select id, '시맨틱 태그 구조 및 검색 엔진 최적화(SEO) 반영', 4 from projects where slug = 'dev-archive-blog';
insert into project_features (project_id, content, display_order)
  select id, 'FastAPI 기반 가볍고 빠른 비동기 텍스트 처리 백엔드 서버', 1 from projects where slug = 'lecture-quiz-assistant';
insert into project_features (project_id, content, display_order)
  select id, '전공 텍스트 구문 분석 및 핵심 키워드 요약 파이프라인', 2 from projects where slug = 'lecture-quiz-assistant';
insert into project_features (project_id, content, display_order)
  select id, 'React 기반의 대화형 퀴즈 인터페이스 및 오답 노트 대시보드', 3 from projects where slug = 'lecture-quiz-assistant';
insert into project_features (project_id, content, display_order)
  select id, '학습 정리 결과 PDF 및 텍스트 파일 내보내기 지원', 4 from projects where slug = 'lecture-quiz-assistant';
insert into project_features (project_id, content, display_order)
  select id, 'Vanilla JS HTML5 Drag and Drop API를 활용한 카드 이동', 1 from projects where slug = 'focus-timer-kanban';
insert into project_features (project_id, content, display_order)
  select id, '집중 시간(25분) 및 휴식 시간(5분) 맞춤 오디오 알림 연동', 2 from projects where slug = 'focus-timer-kanban';
insert into project_features (project_id, content, display_order)
  select id, '일자별 순수 집중 시간 기록 및 통계 데이터 보관', 3 from projects where slug = 'focus-timer-kanban';
insert into project_features (project_id, content, display_order)
  select id, '눈의 피로를 최소화하는 정교한 다크 에디토리얼 UI', 4 from projects where slug = 'focus-timer-kanban';
insert into project_features (project_id, content, display_order)
  select id, '용산공원-이촌-한강을 잇는 생태축 회복 콘셉트 설계', 1 from projects where slug = 'urban-forest-wetland';
insert into project_features (project_id, content, display_order)
  select id, '생태-완충-이용-체험-관리 순으로 이어지는 조닝 전략 수립', 2 from projects where slug = 'urban-forest-wetland';
insert into project_features (project_id, content, display_order)
  select id, '습지를 중심에 두고 숲을 조성하는 마스터플랜 제작', 3 from projects where slug = 'urban-forest-wetland';
insert into project_features (project_id, content, display_order)
  select id, '완충 식재대와 생태 탐방로 등 세부 공간 계획', 4 from projects where slug = 'urban-forest-wetland';
insert into project_features (project_id, content, display_order)
  select id, '유상곡수·화계 등 전통 조경 기법 리서치 및 설계 적용', 1 from projects where slug = 'cheongdo-seowon';
insert into project_features (project_id, content, display_order)
  select id, '전통 정자와 연못을 중심으로 한 공간 구성', 2 from projects where slug = 'cheongdo-seowon';
insert into project_features (project_id, content, display_order)
  select id, '대상지의 곡선형 부지를 살린 동선 계획', 3 from projects where slug = 'cheongdo-seowon';
insert into project_features (project_id, content, display_order)
  select id, '마스터플랜 제작', 4 from projects where slug = 'cheongdo-seowon';

-- ---------------------------------------------------------------------------
-- 5. 기술 태그
-- ---------------------------------------------------------------------------
insert into tags (name) values ('React') on conflict (name) do nothing;
insert into tags (name) values ('Node.js') on conflict (name) do nothing;
insert into tags (name) values ('Express') on conflict (name) do nothing;
insert into tags (name) values ('MySQL') on conflict (name) do nothing;
insert into tags (name) values ('CSS Modules') on conflict (name) do nothing;
insert into tags (name) values ('JavaScript') on conflict (name) do nothing;
insert into tags (name) values ('HTML5/CSS3') on conflict (name) do nothing;
insert into tags (name) values ('LocalStorage') on conflict (name) do nothing;
insert into tags (name) values ('Markdown Parser') on conflict (name) do nothing;
insert into tags (name) values ('Python') on conflict (name) do nothing;
insert into tags (name) values ('FastAPI') on conflict (name) do nothing;
insert into tags (name) values ('REST API') on conflict (name) do nothing;
insert into tags (name) values ('Vanilla JS') on conflict (name) do nothing;
insert into tags (name) values ('Drag & Drop API') on conflict (name) do nothing;
insert into tags (name) values ('Web Audio API') on conflict (name) do nothing;
insert into tags (name) values ('CSS Grid') on conflict (name) do nothing;
insert into tags (name) values ('Photoshop') on conflict (name) do nothing;
insert into tags (name) values ('마스터플랜') on conflict (name) do nothing;
insert into tags (name) values ('팀 프로젝트') on conflict (name) do nothing;
insert into tags (name) values ('생태 설계') on conflict (name) do nothing;
insert into tags (name) values ('전통 조경') on conflict (name) do nothing;

insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'studyroom-reservation-platform' and t.name = 'React'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'studyroom-reservation-platform' and t.name = 'Node.js'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'studyroom-reservation-platform' and t.name = 'Express'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'studyroom-reservation-platform' and t.name = 'MySQL'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'studyroom-reservation-platform' and t.name = 'CSS Modules'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'dev-archive-blog' and t.name = 'JavaScript'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'dev-archive-blog' and t.name = 'HTML5/CSS3'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'dev-archive-blog' and t.name = 'LocalStorage'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'dev-archive-blog' and t.name = 'Markdown Parser'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'lecture-quiz-assistant' and t.name = 'Python'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'lecture-quiz-assistant' and t.name = 'FastAPI'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'lecture-quiz-assistant' and t.name = 'React'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'lecture-quiz-assistant' and t.name = 'REST API'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'focus-timer-kanban' and t.name = 'Vanilla JS'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'focus-timer-kanban' and t.name = 'Drag & Drop API'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'focus-timer-kanban' and t.name = 'Web Audio API'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'focus-timer-kanban' and t.name = 'CSS Grid'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'urban-forest-wetland' and t.name = 'Photoshop'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'urban-forest-wetland' and t.name = '마스터플랜'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'urban-forest-wetland' and t.name = '팀 프로젝트'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'urban-forest-wetland' and t.name = '생태 설계'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'cheongdo-seowon' and t.name = 'Photoshop'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'cheongdo-seowon' and t.name = '마스터플랜'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'cheongdo-seowon' and t.name = '팀 프로젝트'
  on conflict do nothing;
insert into project_tags (project_id, tag_id)
  select p.id, t.id from projects p, tags t where p.slug = 'cheongdo-seowon' and t.name = '전통 조경'
  on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 6. 링크 (GitHub / 영상 / 수상 갤러리)
-- ---------------------------------------------------------------------------
insert into project_links (project_id, kind, url, label, display_order)
  select id, 'github', 'https://github.com/sin030327/shin', 'GitHub', 1 from projects where slug = 'studyroom-reservation-platform';
insert into project_links (project_id, kind, url, label, display_order)
  select id, 'github', 'https://github.com/sin030327/shin', 'GitHub', 1 from projects where slug = 'dev-archive-blog';
insert into project_links (project_id, kind, url, label, display_order)
  select id, 'github', 'https://github.com/sin030327/shin', 'GitHub', 1 from projects where slug = 'lecture-quiz-assistant';
insert into project_links (project_id, kind, url, label, display_order)
  select id, 'github', 'https://github.com/sin030327/shin', 'GitHub', 1 from projects where slug = 'focus-timer-kanban';
insert into project_links (project_id, kind, url, label, display_order)
  select id, 'external', 'https://youtu.be/WI0e0YNzEpc', '출품 영상 보기', 1 from projects where slug = 'cheongdo-seowon';
insert into project_links (project_id, kind, url, label, display_order)
  select id, 'external', 'https://khs.spectory.net/klandscape2/klandscape2/plagiary?bno=122&gno=2&page=2', '공식 수상작 갤러리', 2 from projects where slug = 'cheongdo-seowon';

-- ---------------------------------------------------------------------------
-- 7. 이미지 (파일은 frontend 폴더에 있습니다. 나중에 Supabase Storage로
--    옮기면 이 경로만 바꾸면 됩니다)
-- ---------------------------------------------------------------------------
insert into project_images (project_id, storage_path, alt_text, is_cover, display_order)
  select id, 'project-urban-forest.jpg', '습지를 담은 숲 — 도시숲 설계 공모전', true, 1 from projects where slug = 'urban-forest-wetland';
insert into project_images (project_id, storage_path, alt_text, is_cover, display_order)
  select id, 'project-traditional-garden.jpg', '청도서원(淸道書院)', true, 1 from projects where slug = 'cheongdo-seowon';

-- ---------------------------------------------------------------------------
-- 8. 기술 스택
--    ※ 아래 delete 두 줄은 스킬을 "전부" 지웁니다.
-- ---------------------------------------------------------------------------
delete from skills;
insert into skill_categories (key, label, display_order) values ('FRONTEND', 'FRONTEND', 1)
  on conflict (key) do update set label = excluded.label, display_order = excluded.display_order;
insert into skill_categories (key, label, display_order) values ('BACKEND', 'BACKEND', 2)
  on conflict (key) do update set label = excluded.label, display_order = excluded.display_order;
insert into skill_categories (key, label, display_order) values ('DEV TOOLS', 'DEV TOOLS', 3)
  on conflict (key) do update set label = excluded.label, display_order = excluded.display_order;

insert into skills (category_id, name, level, display_order)
  select id, 'JavaScript (ES6+) / TypeScript', 88, 1 from skill_categories where key = 'FRONTEND';
insert into skills (category_id, name, level, display_order)
  select id, 'React / Next.js Framework', 85, 2 from skill_categories where key = 'FRONTEND';
insert into skills (category_id, name, level, display_order)
  select id, 'HTML5 / Modern CSS / Animations', 90, 3 from skill_categories where key = 'FRONTEND';
insert into skills (category_id, name, level, display_order)
  select id, 'Tailwind CSS & Styled System', 82, 4 from skill_categories where key = 'FRONTEND';
insert into skills (category_id, name, level, display_order)
  select id, 'Node.js & Express RESTful API', 82, 1 from skill_categories where key = 'BACKEND';
insert into skills (category_id, name, level, display_order)
  select id, 'Python & FastAPI', 80, 2 from skill_categories where key = 'BACKEND';
insert into skills (category_id, name, level, display_order)
  select id, 'MySQL / PostgreSQL RDBMS', 82, 3 from skill_categories where key = 'BACKEND';
insert into skills (category_id, name, level, display_order)
  select id, 'Java Core Architecture', 75, 4 from skill_categories where key = 'BACKEND';
insert into skills (category_id, name, level, display_order)
  select id, 'Git Version Control & GitHub', 88, 1 from skill_categories where key = 'DEV TOOLS';
insert into skills (category_id, name, level, display_order)
  select id, 'Docker & Containerization', 72, 2 from skill_categories where key = 'DEV TOOLS';
insert into skills (category_id, name, level, display_order)
  select id, 'Linux Environment & Shell', 80, 3 from skill_categories where key = 'DEV TOOLS';
insert into skills (category_id, name, level, display_order)
  select id, 'Figma UI Prototyping', 78, 4 from skill_categories where key = 'DEV TOOLS';

-- ---------------------------------------------------------------------------
-- 9. 이력
--    ※ 아래 delete 는 이력을 "전부" 지웁니다.
-- ---------------------------------------------------------------------------
delete from timeline_entries;
insert into timeline_entries (period_label, title, role, description, display_order)
  values ('2024 - PRESENT', '상명대학교 (SangMyung University)', '그린스마트시티학과 전공 심화', '자료구조, 알고리즘, 운영체제, 컴퓨터 네트워크, 데이터베이스 등 탄탄한 컴퓨터 공학 기초 이론을 이수하고 다양한 전공 팀 프로젝트를 수행 중입니다.', 1);
insert into timeline_entries (period_label, title, role, description, display_order)
  values ('2025', '대한민국 전통조경대전 제2회', '장려상 수상 · 청도서원(淸道書院)', '전통조경의 공간성과 장소성을 현대적으로 해석한 팀 프로젝트 "청도서원(淸道書院)"으로 대한민국 전통조경대전 제2회에서 장려상을 수상했습니다.', 2);

commit;

-- 확인용: 아래를 따로 실행하면 몇 건씩 들어갔는지 볼 수 있습니다.
--   select 'projects' t, count(*) from projects
--   union all select 'features', count(*) from project_features
--   union all select 'tags', count(*) from project_tags
--   union all select 'links', count(*) from project_links
--   union all select 'skills', count(*) from skills
--   union all select 'timeline', count(*) from timeline_entries;
