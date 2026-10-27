const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');
const db = require('./db');
const { isSupabaseConfigured } = require('./db/supabaseClient');
const contactRouter = require('./routes/contact');
const reservationsRouter = require('./routes/reservations');
const projectsRouter = require('./routes/projects');
const adminAuthRouter = require('./routes/adminAuth');
const adminProjectsRouter = require('./routes/adminProjects');
const adminReservationsRouter = require('./routes/adminReservations');

const app = express();

// credentials: true + 특정 출처(config.corsOrigin) 조합이어야 관리자 로그인 쿠키가
// 브라우저에 정상적으로 저장/전송된다 ('*'는 쿠키와 함께 쓸 수 없음).
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// 프론트엔드가 백엔드 연결 여부를 확인할 때 사용하는 헬스체크 엔드포인트.
// storage 값으로 지금 어디에 저장되고 있는지 한눈에 확인할 수 있다.
//   'supabase'   : Supabase DB에 저장 중
//   'local-file' : .env에 Supabase 값이 없어 로컬 JSON 파일에 저장 중
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    storage: isSupabaseConfigured() ? 'supabase' : 'local-file',
    // (아래는 예전부터 있던 값. DATABASE_URL 설정 여부만 보므로 Supabase와는 무관하다)
    databaseConnected: db.isDatabaseConnected()
  });
});

// 공개 API (인증 불필요)
app.use('/api', contactRouter);
app.use('/api', reservationsRouter);
app.use('/api', projectsRouter);

// 관리자 API (로그인 필요 — adminProjectsRouter 내부에서 requireAdminAuth 적용)
app.use('/api/admin', adminAuthRouter);
app.use('/api/admin', adminProjectsRouter);
app.use('/api/admin', adminReservationsRouter);

app.listen(config.port, () => {
  console.log(`[portfolio-backend] listening on http://localhost:${config.port}`);
  console.log(
    `[portfolio-backend] storage: ${isSupabaseConfigured() ? 'Supabase DB' : '로컬 JSON 파일 (.env에 SUPABASE_* 값이 없음)'}`
  );
});
