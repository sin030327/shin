// 프론트엔드의 방문 예약 폼(frontend/reservation.html)이 호출하는 엔드포인트.
// 지금은 신청 내용을 저장만 하고, 실제 확정 처리(중복 예약 방지, 확정 메일 등)는
// 아직 구현하지 않았다. db.saveReservation()의 주석 참고.
const express = require('express');
const db = require('../db');

const router = express.Router();

// 프론트엔드(reservation.js)의 검증과 동일한 규칙. 서버에서도 한 번 더 확인한다.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/reservations', async (req, res) => {
  const { date, time, name, email, purpose, consent } = req.body || {};

  if (!date || !time || !name || !email || !purpose) {
    return res.status(400).json({ error: 'date, time, name, email, purpose는 모두 필수입니다.' });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: '이메일 형식이 올바르지 않습니다.' });
  }

  if (!consent) {
    return res.status(400).json({ error: '정보 제공 동의가 필요합니다.' });
  }

  try {
    const saved = await db.saveReservation({ date, time, name, email, purpose });
    return res.status(201).json({ ok: true, id: saved.id });
  } catch (err) {
    console.error('[reservations] 예약 저장 실패:', err.message);
    return res.status(500).json({ error: '예약 내용을 저장하지 못했습니다.' });
  }
});

module.exports = router;
