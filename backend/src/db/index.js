// ---------------------------------------------------------------------------
// 데이터 저장 계층.
//
// 지금은 실제 데이터베이스가 연결되어 있지 않다. 그렇다고 데이터를 그냥 버리지
// 않도록, 서버가 실행되는 동안은 로컬 JSON 파일(backend/data/*.local.json)에
// 저장해 둔다. 이 파일들은 .gitignore에 포함되어 있어 git에는 올라가지 않는다.
//
// 나중에 실제 DB(PostgreSQL, MySQL 등)를 연결할 때 할 일:
//   1. .env 의 DATABASE_URL 을 채운다.
//   2. 아래 각 함수 내부의 "로컬 파일" 구현을 실제 DB 드라이버 호출로 교체한다
//      (연락처 메시지 저장 예시는 saveContactMessage() 주석 참고).
//   3. 이 파일을 호출하는 다른 코드(routes/*.js)는 함수 시그니처가 같다면
//      전혀 수정할 필요가 없다. -> 저장 방식이 바뀌어도 API 계층은 영향을 받지
//      않도록 일부러 이렇게 분리해 둔 것이다.
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const config = require('../config');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const MESSAGES_STORE_PATH = path.join(DATA_DIR, 'messages.local.json');
const PROJECTS_STORE_PATH = path.join(DATA_DIR, 'projects.local.json');
const RESERVATIONS_STORE_PATH = path.join(DATA_DIR, 'reservations.local.json');

function isDatabaseConnected() {
  return Boolean(config.databaseUrl);
}

function readJsonStore(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeJsonStore(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// 연락처 폼 메시지
// ---------------------------------------------------------------------------

/**
 * 연락처 폼 메시지 1건을 저장한다.
 * @param {{ name: string, email: string, message: string }} data
 */
async function saveContactMessage(data) {
  if (isDatabaseConnected()) {
    // TODO(DB 연결 시 구현): DATABASE_URL이 채워지면 이 분기를 실제 DB 저장 로직으로 교체한다.
    //
    // 예) PostgreSQL(pg 패키지) 기준:
    //   const { Pool } = require('pg');
    //   const pool = new Pool({ connectionString: config.databaseUrl });
    //   const { rows } = await pool.query(
    //     `INSERT INTO contact_messages (name, email, message, created_at)
    //      VALUES ($1, $2, $3, NOW()) RETURNING id, created_at`,
    //     [data.name, data.email, data.message]
    //   );
    //   return { id: rows[0].id, ...data, createdAt: rows[0].created_at };
    throw new Error(
      'DATABASE_URL은 설정되어 있지만 실제 DB 연결 로직이 아직 구현되지 않았습니다. src/db/index.js의 TODO를 확인하세요.'
    );
  }

  const messages = readJsonStore(MESSAGES_STORE_PATH);
  const record = {
    id: messages.length + 1,
    ...data,
    createdAt: new Date().toISOString()
  };
  messages.push(record);
  writeJsonStore(MESSAGES_STORE_PATH, messages);
  return record;
}

// ---------------------------------------------------------------------------
// 방문 예약 (찾아오는 길 페이지 -> 예약 폼)
// ---------------------------------------------------------------------------

// 처리 상태 4단계. 키는 저장용(영문), 라벨은 관리자 화면 표시용(한글).
//   received         접수      — 방문자가 신청한 그대로의 상태 (기본값)
//   confirmed        확정      — 운영자가 그 날짜/시간을 승인한 상태
//   change_requested 변경 요청 — 미팅은 하되 다른 시간을 요청하는 상태
//   cancelled        취소      — 방문을 진행하지 않는 상태
const RESERVATION_STATUSES = {
  received: '접수',
  confirmed: '확정',
  change_requested: '변경 요청',
  cancelled: '취소'
};

/**
 * 짧은 식별자용 djb2 해시(4자리 base36).
 * 암호학적 용도가 아니라 "같은 신청자면 같은 꼬리표"를 붙이기 위한 것이다.
 */
function shortHash(input) {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(36).toUpperCase().padStart(4, '0').slice(-4);
}

/**
 * 예약 번호를 만든다.
 * 같은 사람이 여러 번 방문할 수 있으므로 신청자(이름+이메일)만으로 만들지 않고,
 * 방문 희망 일시까지 함께 넣어서 예약 건을 구분한다.
 * 예) R-20261015-1500-7KQ2
 * @param {{ name: string, email: string, date: string, time: string }} data
 */
function buildReservationNo(data) {
  const who = `${String(data.name || '').trim().toLowerCase()}|${String(data.email || '').trim().toLowerCase()}`;
  const compactDate = String(data.date || '').replace(/-/g, '');
  const compactTime = String(data.time || '').replace(/:/g, '');
  return `R-${compactDate}-${compactTime}-${shortHash(who)}`;
}

/** 저장된 값이 4단계 중 하나가 아니면(예: 이전 버전의 'pending') 접수로 본다. */
function normalizeReservationStatus(status) {
  return Object.prototype.hasOwnProperty.call(RESERVATION_STATUSES, status) ? status : 'received';
}

/** 관리자 화면에 내보내기 전에 예약 번호/상태를 보정한다. */
function decorateReservation(record) {
  return {
    ...record,
    reservationNo: record.reservationNo || buildReservationNo(record),
    status: normalizeReservationStatus(record.status),
    statusLabel: RESERVATION_STATUSES[normalizeReservationStatus(record.status)]
  };
}

/**
 * 방문 예약 신청 1건을 저장한다.
 * 지금은 "실제 처리"(확정 메일 발송 등)는 하지 않고, 운영자가 관리자 화면에서
 * 확인/상태 변경할 수 있도록 저장만 한다.
 *
 * TODO(다음 단계): 같은 날짜·시간에 이미 'confirmed' 예약이 있으면 중복 접수를
 *   막아야 한다. 지금은 겹치는 신청도 그대로 저장되며, 운영자가 관리자 화면에서
 *   직접 보고 판단한다.
 *
 * @param {{ date: string, time: string, name: string, email: string, purpose: string }} data
 */
async function saveReservation(data) {
  if (isDatabaseConnected()) {
    // TODO(DB 연결 시 구현): saveContactMessage()와 동일한 방식으로 실제 INSERT로 교체.
    throw new Error(
      'DATABASE_URL은 설정되어 있지만 실제 DB 연결 로직이 아직 구현되지 않았습니다. src/db/index.js의 TODO를 확인하세요.'
    );
  }

  const reservations = readJsonStore(RESERVATIONS_STORE_PATH);
  const record = {
    id: reservations.length + 1,
    reservationNo: buildReservationNo(data),
    status: 'received',
    ...data,
    createdAt: new Date().toISOString()
  };
  reservations.push(record);
  writeJsonStore(RESERVATIONS_STORE_PATH, reservations);
  return record;
}

/** 관리자 화면용: 전체 예약을 최신 신청순으로 반환한다. */
function listAllReservations() {
  const reservations = readJsonStore(RESERVATIONS_STORE_PATH);
  return reservations
    .map(decorateReservation)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * 예약의 처리 상태를 바꾼다. 대상이 없으면 null을 반환한다.
 * @param {string|number} id
 * @param {'received'|'confirmed'|'change_requested'|'cancelled'} status
 */
function updateReservationStatus(id, status) {
  if (isDatabaseConnected()) {
    // TODO(DB 연결 시 구현): 실제 UPDATE 쿼리로 교체.
    throw new Error(
      'DATABASE_URL은 설정되어 있지만 실제 DB 연결 로직이 아직 구현되지 않았습니다. src/db/index.js의 TODO를 확인하세요.'
    );
  }

  const reservations = readJsonStore(RESERVATIONS_STORE_PATH);
  const idx = reservations.findIndex((r) => String(r.id) === String(id));
  if (idx === -1) return null;

  reservations[idx] = {
    ...reservations[idx],
    status,
    statusUpdatedAt: new Date().toISOString()
  };
  writeJsonStore(RESERVATIONS_STORE_PATH, reservations);
  return decorateReservation(reservations[idx]);
}

// ---------------------------------------------------------------------------
// 프로젝트 (관리자 페이지에서 등록/수정하는 항목)
// ---------------------------------------------------------------------------

function generateProjectId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 관리자 화면용: 초안 포함 전체 프로젝트를 최신 수정순으로 반환한다. */
function listAllProjects() {
  const projects = readJsonStore(PROJECTS_STORE_PATH);
  return [...projects].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

/** 공개 사이트용: status가 'published'인 프로젝트만 반환한다. */
function listPublishedProjects() {
  return listAllProjects().filter((p) => p.status === 'published');
}

function getProjectById(id) {
  const projects = readJsonStore(PROJECTS_STORE_PATH);
  return projects.find((p) => String(p.id) === String(id)) || null;
}

/**
 * 새 프로젝트를 저장한다. (필수값 검증은 routes 쪽에서 이미 끝냈다고 가정)
 * @param {{ title, role, description, date, teamSize, notes, status }} data
 */
function createProject(data) {
  if (isDatabaseConnected()) {
    // TODO(DB 연결 시 구현): saveContactMessage()와 동일한 방식으로 실제 INSERT로 교체.
    throw new Error(
      'DATABASE_URL은 설정되어 있지만 실제 DB 연결 로직이 아직 구현되지 않았습니다. src/db/index.js의 TODO를 확인하세요.'
    );
  }

  const projects = readJsonStore(PROJECTS_STORE_PATH);
  const now = new Date().toISOString();
  const record = {
    id: generateProjectId(),
    title: data.title || '',
    role: data.role || '',
    description: data.description || '',
    date: data.date || '',
    teamSize: data.teamSize || '',
    notes: data.notes || '',
    status: data.status,
    createdAt: now,
    updatedAt: now
  };
  projects.push(record);
  writeJsonStore(PROJECTS_STORE_PATH, projects);
  return record;
}

/** 기존 프로젝트를 수정한다. 대상이 없으면 null을 반환한다. */
function updateProject(id, data) {
  if (isDatabaseConnected()) {
    // TODO(DB 연결 시 구현): 실제 UPDATE 쿼리로 교체.
    throw new Error(
      'DATABASE_URL은 설정되어 있지만 실제 DB 연결 로직이 아직 구현되지 않았습니다. src/db/index.js의 TODO를 확인하세요.'
    );
  }

  const projects = readJsonStore(PROJECTS_STORE_PATH);
  const idx = projects.findIndex((p) => String(p.id) === String(id));
  if (idx === -1) return null;

  const now = new Date().toISOString();
  projects[idx] = {
    ...projects[idx],
    title: data.title ?? projects[idx].title,
    role: data.role ?? projects[idx].role,
    description: data.description ?? projects[idx].description,
    date: data.date ?? projects[idx].date,
    teamSize: data.teamSize ?? projects[idx].teamSize,
    notes: data.notes ?? projects[idx].notes,
    status: data.status ?? projects[idx].status,
    updatedAt: now
  };
  writeJsonStore(PROJECTS_STORE_PATH, projects);
  return projects[idx];
}

/** 프로젝트를 삭제한다. 삭제되었으면 true, 대상이 없었으면 false. */
function deleteProject(id) {
  const projects = readJsonStore(PROJECTS_STORE_PATH);
  const next = projects.filter((p) => String(p.id) !== String(id));
  const changed = next.length !== projects.length;
  if (changed) writeJsonStore(PROJECTS_STORE_PATH, next);
  return changed;
}

module.exports = {
  isDatabaseConnected,
  saveContactMessage,
  RESERVATION_STATUSES,
  buildReservationNo,
  saveReservation,
  listAllReservations,
  updateReservationStatus,
  listAllProjects,
  listPublishedProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
};
