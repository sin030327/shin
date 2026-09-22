const express = require('express');
const cors = require('cors');
const config = require('./config');
const db = require('./db');
const contactRouter = require('./routes/contact');

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// 프론트엔드가 백엔드 연결 여부를 확인할 때 사용하는 헬스체크 엔드포인트.
// databaseConnected 값으로 DB 연결 여부도 함께 확인할 수 있다.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    databaseConnected: db.isDatabaseConnected()
  });
});

app.use('/api', contactRouter);

app.listen(config.port, () => {
  console.log(`[portfolio-backend] listening on http://localhost:${config.port}`);
  console.log(`[portfolio-backend] database connected: ${db.isDatabaseConnected()}`);
});
