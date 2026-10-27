-- ===========================================================================
--  포트폴리오 DB — 테이블 고치기 (3/3)
--
--  실행 방법: Supabase -> SQL Editor -> New query -> 이 파일 전체 붙여넣고 Run
--
--  왜 필요한가요?
--  01_tables.sql을 만들 때 두 가지를 놓쳤습니다. 실제 관리자 화면과 맞춰보니
--  드러난 것이라, 이 파일로 바로잡습니다. 이미 만든 표를 지우지 않고 고칩니다.
--
--    (1) '내가 한 역할'(role)을 넣을 칸이 없었습니다.
--    (2) slug(주소에 쓰는 이름)를 '반드시 있어야 하는 칸'으로 만들어 뒀는데,
--        관리자 화면에는 그걸 입력하는 곳이 없습니다. 비워둘 수 있게 바꿉니다.
--
--  여러 번 실행해도 안전합니다.
-- ===========================================================================

-- (1) '내가 한 역할' 칸 추가            [공개]
alter table projects
  add column if not exists role text;

-- (2) slug를 비워둘 수 있게 바꾸기
--     (나중에 주소를 예쁘게 만들고 싶어지면 그때 채우면 됩니다)
alter table projects
  alter column slug drop not null;

-- 확인용: 아래를 실행하면 projects 표의 칸 목록이 나옵니다.
-- select column_name, data_type, is_nullable
--   from information_schema.columns
--  where table_name = 'projects'
--  order by ordinal_position;
