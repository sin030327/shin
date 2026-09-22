const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');
const db = require('./db');
const contactRouter = require('./routes/contact');
const projectsRouter = require('./routes/projects');
const adminAuthRouter = require('./routes/adminAuth');
const adminProjectsRouter = require('./routes/adminProjects');

const app = express();

// credentials: true + 특정 출처(config.corsOrigin) 조합이어야 관리자 로그인 쿠키가
// 브라우저에 정상적으로 저장/전송된다 ('*'는 쿠키와 함께 쓸 수 없음).
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// 프론트엔드가 백엔드 연결 여부를 확인할 때 사용하는 헬스체크 엔드포인트.
// databaseConnected 값으로 DB 연결 여부도 함께 확인할 수 있다.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    databaseConnected: db.isDatabaseConnected()
  });
});

// 공개 API (인증 불필요)
app.use('/api', contactRouter);
app.use('/api', projectsRouter);

// 관리자 API (로그인 필요 — adminProjectsRouter 내부에서 requireAdminAuth 적용)
app.use('/api/admin', adminAuthRouter);
app.use('/api/admin', adminProjectsRouter);

app.listen(config.port, () => {
  console.log(`[portfolio-backend] listening on http://localhost:${config.port}`);
  console.log(`[portfolio-backend] database connected: ${db.isDatabaseConnected()}`);
});
