// 프론트엔드의 연락처 폼(#editorial-form)이 호출하는 엔드포인트.
const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/contact', async (req, res) => {
  const { name, email, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, message는 모두 필수입니다.' });
  }

  try {
    const saved = await db.saveContactMessage({ name, email, message });
    return res.status(201).json({ ok: true, id: saved.id });
  } catch (err) {
    console.error('[contact] 메시지 저장 실패:', err.message);
    return res.status(500).json({ error: '메시지를 저장하지 못했습니다.' });
  }
});

module.exports = router;
