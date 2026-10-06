// 관리자 페이지 전용 방문 예약 조회/상태 변경.
// 이 파일의 모든 라우트는 requireAdminAuth로 보호된다 (adminProjects.js와 동일한 방식).
const express = require('express');
const db = require('../db');
const { requireAdminAuth } = require('../auth');

const router = express.Router();

router.use(requireAdminAuth);

// 관리자 화면 목록: 전체 예약 (최신 신청순)
router.get('/reservations', (req, res) => {
  try {
    res.json(db.listAllReservations());
  } catch (err) {
    console.error('[admin/reservations] 목록 조회 실패:', err.message);
    res.status(500).json({ error: '예약 목록을 불러오지 못했습니다.' });
  }
});

// 상태 변경: 접수 / 확정 / 변경 요청 / 취소
router.patch('/reservations/:id/status', (req, res) => {
  const { status } = req.body || {};
  const allowed = Object.keys(db.RESERVATION_STATUSES);

  if (!allowed.includes(status)) {
    return res.status(400).json({
      error: `status는 ${allowed.join(', ')} 중 하나여야 합니다.`
    });
  }

  try {
    const updated = db.updateReservationStatus(req.params.id, status);
    if (!updated) {
      return res.status(404).json({ error: '해당 예약을 찾을 수 없습니다.' });
    }
    res.json(updated);
  } catch (err) {
    console.error('[admin/reservations] 상태 변경 실패:', err.message);
    res.status(500).json({ error: '예약 상태를 변경하지 못했습니다.' });
  }
});

module.exports = router;
