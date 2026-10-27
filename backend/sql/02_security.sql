-- ===========================================================================
--  포트폴리오 DB — 공개/비공개 설정 (2/2)
--
--  실행 방법: 01_tables.sql을 먼저 돌린 뒤, SQL Editor에 이 파일을 붙여넣고 Run
--
--  Supabase에는 두 종류의 "손님"이 있습니다.
--    anon          = 로그인하지 않은 사람 (사이트 방문자)
--    authenticated = 로그인한 사람 (= 나, 관리자)
--
--  공개/비공개를 정하는 방법은 두 가지이고, 둘을 같이 씁니다.
--
--    (1) 행 단위 — RLS
--        "어떤 '줄'을 보여줄까?"  예: 공개 상태인 프로젝트만
--
--    (2) 열 단위 — 공개 뷰(VIEW)
--        "어떤 '칸'을 보여줄까?"  예: 예약에서 날짜/시간만 보여주고 이름은 숨김
--        뷰는 "공개할 칸만 뚫어둔 창문"입니다. 원본 표는 잠가두고 창문만 열어줍니다.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 0-A. 이 파일은 몇 번을 다시 실행해도 괜찮아야 합니다.
--      그런데 '정책(policy)'은 같은 이름으로 두 번 만들 수 없어서,
--      먼저 우리 표들의 기존 정책을 지우고 시작합니다.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  target_tables text[] := array[
    'project_categories','projects','project_features','project_links',
    'project_images','tags','project_tags','skill_categories','skills',
    'timeline_entries','reservations','reservation_status_logs','holidays',
    'reservation_time_slots','contact_messages','site_profile','visit_location'
  ];
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public' and tablename = any(target_tables)
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- 0-B. 모든 표에 자물쇠를 채운다 (RLS 켜기)
--    이걸 켜면 "허용한다고 적은 것만" 통과합니다. 기본값은 전부 차단입니다.
-- ---------------------------------------------------------------------------
alter table project_categories     enable row level security;
alter table projects               enable row level security;
alter table project_features       enable row level security;
alter table project_links          enable row level security;
alter table project_images         enable row level security;
alter table tags                   enable row level security;
alter table project_tags           enable row level security;
alter table skill_categories       enable row level security;
alter table skills                 enable row level security;
alter table timeline_entries       enable row level security;
alter table reservations           enable row level security;
alter table reservation_status_logs enable row level security;
alter table holidays               enable row level security;
alter table reservation_time_slots enable row level security;
alter table contact_messages       enable row level security;
alter table site_profile           enable row level security;
alter table visit_location         enable row level security;


-- ---------------------------------------------------------------------------
-- 1. 관리자(로그인한 나)는 모든 표를 전부 다룰 수 있다
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'project_categories','projects','project_features','project_links',
    'project_images','tags','project_tags','skill_categories','skills',
    'timeline_entries','reservations','reservation_status_logs','holidays',
    'reservation_time_slots','contact_messages','site_profile','visit_location'
  ] loop
    execute format(
      'create policy "admin full access" on %I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- 2. 포트폴리오 전시 — 방문자는 "공개 상태인 것만" 읽기 가능
--    (행 단위 제어)
-- ---------------------------------------------------------------------------
create policy "anyone reads published projects"
  on projects for select to anon
  using (status = 'published');

-- 딸린 표들은 "공개된 프로젝트에 속한 줄"만 보이게 한다
create policy "anyone reads features of published projects"
  on project_features for select to anon
  using (exists (select 1 from projects p where p.id = project_id and p.status = 'published'));

create policy "anyone reads links of published projects"
  on project_links for select to anon
  using (exists (select 1 from projects p where p.id = project_id and p.status = 'published'));

create policy "anyone reads images of published projects"
  on project_images for select to anon
  using (exists (select 1 from projects p where p.id = project_id and p.status = 'published'));

create policy "anyone reads tags of published projects"
  on project_tags for select to anon
  using (exists (select 1 from projects p where p.id = project_id and p.status = 'published'));

create policy "anyone reads categories"  on project_categories for select to anon using (true);
create policy "anyone reads tag names"   on tags               for select to anon using (true);
create policy "anyone reads skill cats"  on skill_categories   for select to anon using (true);
create policy "anyone reads public skills"
  on skills for select to anon using (is_public = true);
create policy "anyone reads public timeline"
  on timeline_entries for select to anon using (is_public = true);
create policy "anyone reads site profile" on site_profile      for select to anon using (true);
create policy "anyone reads visit location" on visit_location  for select to anon using (true);
create policy "anyone reads holidays"     on holidays          for select to anon using (true);
create policy "anyone reads active slots"
  on reservation_time_slots for select to anon using (is_active = true);


-- ---------------------------------------------------------------------------
-- 3. 방문 예약 — 여기가 핵심입니다
--
--    신청(INSERT)은 누구나 할 수 있어야 하지만,
--    읽기(SELECT)는 한 줄도 허용하면 안 됩니다.
--    허용하면 방문자가 다른 사람의 이름·이메일·방문목적을 전부 볼 수 있습니다.
-- ---------------------------------------------------------------------------
create policy "anyone can submit a reservation"
  on reservations for insert to anon
  with check (true);

--  ↑ SELECT 정책을 일부러 만들지 않았습니다. 따라서 anon은 이 표를 못 읽습니다.
--    (관리자는 1번의 "admin full access"로 전부 읽습니다)

-- 그런데 예약 페이지는 "어느 시간이 찼는지"는 알아야 합니다.
-- 그래서 날짜/시간 두 칸만 뚫어둔 '창문'을 만듭니다.  ← 열 단위 공개
--
-- ※ 뷰가 RLS를 통과하는 이유: 뷰는 '뷰를 만든 사람'의 권한으로 실행됩니다.
--   그래서 원본 표를 못 읽는 anon도 이 창문으로는 볼 수 있습니다.
--   바로 이것이 "원본은 잠그고 일부 칸만 공개"가 가능한 원리입니다.
--   Supabase 보안 점검 화면에 'security definer view' 경고가 뜰 수 있는데,
--   여기서는 의도한 동작이므로 그대로 두면 됩니다.
create or replace view public_booked_slots as
  select visit_date, visit_time
  from reservations
  where status in ('received', 'confirmed');

grant select on public_booked_slots to anon, authenticated;

-- 문의 메시지: 보내기만 되고, 읽기는 관리자만
create policy "anyone can send a message"
  on contact_messages for insert to anon
  with check (true);


-- ---------------------------------------------------------------------------
-- 4. 프로젝트에서도 숨길 칸이 있습니다 (notes = 나만 보는 메모)
--    2번의 RLS는 "어떤 줄"만 정하지 "어떤 칸"은 정하지 않습니다.
--    그래서 공개용 창문을 따로 만들어 notes 를 아예 빼버립니다.
-- ---------------------------------------------------------------------------
create or replace view public_projects as
  select
    p.id, p.slug, p.title, p.summary, p.description,
    p.started_on, p.team_size, p.award,
    c.key   as category_key,
    c.label_ko as category_label
  from projects p
  left join project_categories c on c.id = p.category_id
  where p.status = 'published'
  order by p.display_order, p.started_on desc;
  --  notes / status / created_at 은 여기에 없으므로 방문자가 볼 방법이 없습니다.

grant select on public_projects to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 5. (선택) 더 엄격하게 잠그고 싶다면 — 열 단위 권한
--
--    뷰 대신, 원본 표에서 특정 칸만 읽도록 권한을 줄 수도 있습니다.
--      revoke select on projects from anon;
--      grant select (id, slug, title, summary) on projects to anon;
--
--    ※ 주의: 이렇게 하면 코드에서 select('*') 를 쓸 수 없게 됩니다.
--      (권한 없는 칸까지 달라는 요청이 되어 오류가 납니다)
--      칸 이름을 하나하나 적어야 하므로, 처음에는 위의 '뷰' 방식을 권합니다.
-- ---------------------------------------------------------------------------
