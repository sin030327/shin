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
  listAllProjects,
  listPublishedProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
};
