// 공개 사이트(frontend)가 호출하는 엔드포인트. 인증 불필요.
// status가 'published'인 프로젝트만 노출한다 — 초안은 절대 여기 섞이지 않는다.
const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/projects', (req, res) => {
  res.json(db.listPublishedProjects());
});

module.exports = router;
