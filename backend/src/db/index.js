// ---------------------------------------------------------------------------
// 데이터 저장 계층.
//
// 지금은 실제 데이터베이스가 연결되어 있지 않다. 그렇다고 제출된 데이터를
// 그냥 버리지 않도록, 서버가 실행되는 동안은 로컬 JSON 파일에 임시로 저장해 둔다.
//
// 나중에 실제 DB(PostgreSQL, MySQL 등)를 연결할 때 할 일:
//   1. .env 의 DATABASE_URL 을 채운다.
//   2. 아래 saveContactMessage() 함수 내부의 "DB 미연결" 분기를 실제
//      DB 드라이버 연결 + INSERT 쿼리로 교체한다 (예시는 주석 참고).
//   3. 이 파일을 호출하는 다른 코드(routes/contact.js 등)는 전혀 수정할 필요가 없다.
//      -> 데이터 저장 방식이 바뀌어도 API 계층은 영향을 받지 않도록 분리해 둔 것.
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const config = require('../config');

const LOCAL_STORE_PATH = path.join(__dirname, '..', '..', 'data', 'messages.local.json');

function isDatabaseConnected() {
  return Boolean(config.databaseUrl);
}

function readLocalStore() {
  try {
    const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeLocalStore(messages) {
  fs.mkdirSync(path.dirname(LOCAL_STORE_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(messages, null, 2), 'utf-8');
}

/**
 * 연락처 폼 메시지 1건을 저장한다.
 * @param {{ name: string, email: string, message: string }} data
 * @returns {Promise<{ id: number|string, name: string, email: string, message: string, createdAt: string }>}
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

  const messages = readLocalStore();
  const record = {
    id: messages.length + 1,
    ...data,
    createdAt: new Date().toISOString()
  };
  messages.push(record);
  writeLocalStore(messages);
  return record;
}

module.exports = {
  isDatabaseConnected,
  saveContactMessage
};
