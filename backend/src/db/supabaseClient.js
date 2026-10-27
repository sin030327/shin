// ---------------------------------------------------------------------------
// Supabase 연결 지점.
//
// ★ 자주 하는 오해: "테이블이 10개면 연결도 10번 해야 하나요?"  아닙니다.
//   연결(클라이언트)은 이 파일에서 '딱 한 번' 만들고,
//   테이블 10개를 전부 그 하나로 다룹니다.
//     supabase.from('projects')     -> 프로젝트 표
//     supabase.from('reservations') -> 예약 표
//   표가 늘어나도 이 파일은 그대로입니다.
//
// 열쇠가 두 개인 이유:
//   service_role = 마스터 열쇠. 모든 보안 규칙(RLS)을 통과한다.
//                  이 서버 안에서만 쓴다. 관리자 기능(예약 목록 조회 등)에 사용.
//   anon         = 손님 열쇠. 공개로 허용한 것만 읽을 수 있다.
//                  나중에 프론트엔드에서 직접 호출할 때 쓴다.
// ---------------------------------------------------------------------------

const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

let adminClient = null;

/**
 * 관리자 권한 클라이언트를 돌려준다 (처음 한 번만 만들고 계속 재사용).
 * 서버 안에서만 호출해야 한다 — 이 열쇠는 보안 규칙을 통과한다.
 */
function getSupabaseAdmin() {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error(
      'Supabase 설정이 비어 있습니다. backend/.env 의 SUPABASE_URL과 ' +
      'SUPABASE_SERVICE_ROLE_KEY를 채운 뒤 다시 실행하세요.'
    );
  }

  if (!adminClient) {
    adminClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false }, // 서버에는 로그인 세션을 저장할 필요가 없다
    });
  }
  return adminClient;
}

/** Supabase를 쓸 준비가 되었는지 (.env가 채워졌는지) 확인한다. */
function isSupabaseConfigured() {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
}

module.exports = { getSupabaseAdmin, isSupabaseConfigured };
