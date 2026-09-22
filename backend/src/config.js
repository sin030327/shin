// 환경 변수를 한 곳에서만 읽어오도록 모아둔 설정 모듈.
// 다른 파일에서는 process.env를 직접 읽지 않고 이 모듈을 통해서만 값을 가져온다.
// -> 나중에 값이 늘어나거나 검증 로직이 필요해져도 이 파일 하나만 고치면 된다.

require('dotenv').config();

const config = {
  port: Number(process.env.PORT) || 4000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5500',

  // 아직 비어 있어도 정상 동작해야 한다 (DB 미연결 상태 지원).
  // 값이 채워지면 db/index.js가 이 값을 읽어 실제 연결을 시도하게 된다.
  databaseUrl: process.env.DATABASE_URL || ''
};

module.exports = config;
