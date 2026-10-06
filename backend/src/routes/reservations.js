// 프론트엔드의 방문 예약 폼(frontend/reservation.html)이 호출하는 엔드포인트.
// 지금은 신청 내용을 저장만 하고, 실제 확정 처리(확정 메일 등)는 아직 구현하지 않았다.
// db.saveReservation()의 주석 참고.
const express = require('express');
const db = require('../db');

const router = express.Router();

// 프론트엔드(reservation.js)의 검증과 동일한 규칙. 서버에서도 한 번 더 확인한다.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 이미 예약이 찬 날짜·시간 목록 (공개).
 *
 * 예약 페이지가 "선택할 수 없는 시간"을 표시하는 데 쓴다.
 * 로그인 없이 누구나 호출할 수 있으므로, 신청자 이름/이메일/방문 목적 등
 * 개인정보는 일절 내보내지 않고 날짜와 시간만 반환한다.
 */
router.get('/reservations/booked-slots', (req, res) => {
  try {
    res.json({ slots: db.listBookedSlots() });
  } catch (err) {
    console.error('[reservations] 예약 현황 조회 실패:', err.message);
    res.status(500).json({ error: '예약 현황을 불러오지 못했습니다.' });
  }
});

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
    return res.status(201).json({ ok: true, id: saved.id, reservationNo: saved.reservationNo });
  } catch (err) {
    // 화면에서 막아도, 폼을 열어둔 사이에 다른 사람이 같은 시간을 예약했을 수 있다.
    // 그 경우를 409로 구분해서 알려주면 프론트엔드가 다시 안내할 수 있다.
    if (err.code === 'SLOT_TAKEN') {
      return res.status(409).json({ error: err.message, code: 'SLOT_TAKEN' });
    }
    console.error('[reservations] 예약 저장 실패:', err.message);
    return res.status(500).json({ error: '예약 내용을 저장하지 못했습니다.' });
  }
});

module.exports = router;
