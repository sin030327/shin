// ---------------------------------------------------------------------------
// Supabase에 실제로 읽고 쓰는 부분.
//
// db/index.js가 "저장 방식"을 한 겹 감싸고 있어서, 이 파일만 끼워 넣으면
// 라우터(routes/*.js)와 프론트엔드는 한 줄도 고치지 않아도 됩니다.
//
// 이름이 서로 다른 점을 여기서 번역합니다.
//   코드에서 쓰는 이름        DB의 칸 이름
//   date, time          <->  visit_date, visit_time
//   reservationNo       <->  reservation_no
//   teamSize            <->  team_size
//   date (프로젝트)      <->  started_on
// ---------------------------------------------------------------------------

const { getSupabaseAdmin } = require('./supabaseClient');

// 처리 상태 4단계 (db/index.js와 같은 값)
const RESERVATION_STATUSES = {
  received: '접수',
  confirmed: '확정',
  change_requested: '변경 요청',
  cancelled: '취소'
};

const SLOT_BLOCKING_STATUSES = ['received', 'confirmed'];

/** 이미 찬 시간에 예약하려 할 때 던지는 에러 (라우터가 409로 바꿔 보냄) */
class SlotTakenError extends Error {
  constructor(date, time) {
    super(`이미 예약된 시간입니다. (${date} ${time})`);
    this.name = 'SlotTakenError';
    this.code = 'SLOT_TAKEN';
  }
}

/** Supabase가 돌려준 오류를 보기 좋은 Error로 바꾼다. */
function fail(action, error) {
  throw new Error(`${action} 실패: ${error.message}`);
}

/**
 * Postgres의 time 칸은 "14:00:00"처럼 초까지 붙어서 돌아온다.
 * 화면과 프론트엔드는 "14:00" 형태를 쓰므로 뒤를 잘라준다.
 */
function trimTime(value) {
  return typeof value === 'string' ? value.slice(0, 5) : value;
}

// ---------------------------------------------------------------------------
// 연락처 메시지
// ---------------------------------------------------------------------------

async function saveContactMessage(data) {
  const { data: row, error } = await getSupabaseAdmin()
    .from('contact_messages')
    .insert({
      name: data.name,
      email: data.email,
      subject: data.subject || null,
      message: data.message
    })
    .select()
    .single();

  if (error) fail('문의 메시지 저장', error);
  return { id: row.id, ...data, createdAt: row.created_at };
}

// ---------------------------------------------------------------------------
// 방문 예약
// ---------------------------------------------------------------------------

function shortHash(input) {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(36).toUpperCase().padStart(4, '0').slice(-4);
}

function buildReservationNo(data) {
  const who = `${String(data.name || '').trim().toLowerCase()}|${String(data.email || '').trim().toLowerCase()}`;
  const d = String(data.date || '').replace(/-/g, '');
  const t = String(data.time || '').replace(/:/g, '');
  return `R-${d}-${t}-${shortHash(who)}`;
}

/** DB의 한 줄 -> 코드가 쓰는 모양 */
function fromReservationRow(row) {
  const status = Object.prototype.hasOwnProperty.call(RESERVATION_STATUSES, row.status)
    ? row.status
    : 'received';

  return {
    id: row.id,
    reservationNo: row.reservation_no,
    date: row.visit_date,
    time: trimTime(row.visit_time),
    name: row.name,
    email: row.email,
    purpose: row.purpose,
    status,
    statusLabel: RESERVATION_STATUSES[status],
    createdAt: row.created_at,
    statusUpdatedAt: row.status_updated_at
  };
}

/**
 * 예약 1건 저장.
 *
 * 중복 방지는 DB가 직접 한다. 01_tables.sql에서 만든 부분 유니크 인덱스
 * (uniq_active_reservation_slot) 덕분에, 같은 날짜·시간에 살아있는 예약이
 * 이미 있으면 Postgres가 23505(중복) 오류를 돌려준다.
 * 이 방식은 서버가 여러 대로 늘어나도 안전하다.
 */
async function saveReservation(data) {
  const { data: row, error } = await getSupabaseAdmin()
    .from('reservations')
    .insert({
      reservation_no: buildReservationNo(data),
      visit_date: data.date,
      visit_time: data.time,
      name: data.name,
      email: data.email,
      purpose: data.purpose,
      status: 'received',
      consent_at: data.consent ? new Date().toISOString() : null
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new SlotTakenError(data.date, data.time);
    }
    fail('예약 저장', error);
  }
  return fromReservationRow(row);
}

/** 이미 찬 (날짜, 시간) 목록. 개인정보 없이 날짜/시간만 돌려준다. */
async function listBookedSlots() {
  const { data, error } = await getSupabaseAdmin()
    .from('reservations')
    .select('visit_date, visit_time')
    .in('status', SLOT_BLOCKING_STATUSES);

  if (error) fail('예약 현황 조회', error);

  const seen = new Set();
  const slots = [];
  (data || []).forEach((r) => {
    const time = trimTime(r.visit_time);
    const key = `${r.visit_date}T${time}`;
    if (seen.has(key)) return;
    seen.add(key);
    slots.push({ date: r.visit_date, time });
  });
  return slots;
}

async function isSlotTaken(date, time) {
  const slots = await listBookedSlots();
  return slots.some((s) => s.date === date && s.time === time);
}

/** 관리자 화면용: 전체 예약을 최신 신청순으로 */
async function listAllReservations() {
  const { data, error } = await getSupabaseAdmin()
    .from('reservations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) fail('예약 목록 조회', error);
  return (data || []).map(fromReservationRow);
}

/** 처리 상태 변경. 대상이 없으면 null */
async function updateReservationStatus(id, status) {
  const client = getSupabaseAdmin();

  const { data: before } = await client
    .from('reservations').select('status').eq('id', id).maybeSingle();

  const { data, error } = await client
    .from('reservations')
    .update({ status, status_updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) fail('예약 상태 변경', error);
  if (!data) return null;

  // 상태가 언제 어떻게 바뀌었는지 기록을 남긴다 (실패해도 본 작업은 유지)
  const { error: logError } = await client.from('reservation_status_logs').insert({
    reservation_id: id,
    from_status: before ? before.status : null,
    to_status: status
  });
  if (logError) console.error('[supabaseStore] 상태 변경 기록 실패:', logError.message);

  return fromReservationRow(data);
}

// ---------------------------------------------------------------------------
// 프로젝트
// ---------------------------------------------------------------------------

/** DB의 한 줄 -> 관리자 화면이 쓰는 모양 */
function fromProjectRow(row) {
  return {
    id: row.id,
    title: row.title || '',
    role: row.role || '',
    description: row.description || '',
    date: row.started_on || '',
    teamSize: row.team_size === null || row.team_size === undefined ? '' : String(row.team_size),
    notes: row.notes || '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/** 관리자 화면이 보낸 값 -> DB에 넣을 모양 */
function toProjectRow(data) {
  const teamSize = String(data.teamSize ?? '').trim();
  return {
    title: data.title || '',
    role: data.role || null,
    description: data.description || '',
    // date / int 칸에는 빈 문자열을 넣을 수 없어서 null로 바꿔준다
    started_on: data.date ? data.date : null,
    team_size: teamSize === '' ? null : Number(teamSize),
    notes: data.notes || null,
    status: data.status
  };
}

async function listAllProjects() {
  const { data, error } = await getSupabaseAdmin()
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) fail('프로젝트 목록 조회', error);
  return (data || []).map(fromProjectRow);
}

async function listPublishedProjects() {
  const { data, error } = await getSupabaseAdmin()
    .from('projects')
    .select('*')
    .eq('status', 'published')
    .order('updated_at', { ascending: false });

  if (error) fail('공개 프로젝트 조회', error);
  return (data || []).map(fromProjectRow);
}

async function getProjectById(id) {
  const { data, error } = await getSupabaseAdmin()
    .from('projects').select('*').eq('id', id).maybeSingle();

  if (error) fail('프로젝트 조회', error);
  return data ? fromProjectRow(data) : null;
}

async function createProject(data) {
  const { data: row, error } = await getSupabaseAdmin()
    .from('projects')
    .insert(toProjectRow(data))
    .select()
    .single();

  if (error) fail('프로젝트 저장', error);
  return fromProjectRow(row);
}

async function updateProject(id, data) {
  const { data: row, error } = await getSupabaseAdmin()
    .from('projects')
    .update({ ...toProjectRow(data), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) fail('프로젝트 수정', error);
  return row ? fromProjectRow(row) : null;
}

/** 삭제되면 true, 대상이 없었으면 false */
async function deleteProject(id) {
  const { data, error } = await getSupabaseAdmin()
    .from('projects').delete().eq('id', id).select();

  if (error) fail('프로젝트 삭제', error);
  return Array.isArray(data) && data.length > 0;
}

module.exports = {
  RESERVATION_STATUSES,
  SLOT_BLOCKING_STATUSES,
  SlotTakenError,
  buildReservationNo,
  saveContactMessage,
  saveReservation,
  listBookedSlots,
  isSlotTaken,
  listAllReservations,
  updateReservationStatus,
  listAllProjects,
  listPublishedProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
};
