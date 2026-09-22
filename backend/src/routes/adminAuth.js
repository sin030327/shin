const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { isAuthConfigured, issueToken, setAuthCookie, clearAuthCookie, requireAdminAuth } = require('../auth');
const { isLocked, recordFailedAttempt, clearAttempts, MAX_ATTEMPTS } = require('../loginRateLimiter');

const router = express.Router();

router.post('/login', async (req, res) => {
  const ip = req.ip;

  // 짧은 비밀번호(예: 4자리 숫자)도 무차별 대입으로 뚫리지 않도록,
  // 같은 IP가 반복해서 틀리면 잠시 로그인 자체를 막는다.
  if (isLocked(ip)) {
    return res.status(429).json({
      error: `로그인 시도가 너무 많습니다. 10분 후 다시 시도하세요. (${MAX_ATTEMPTS}회 연속 실패 시 잠금)`
    });
  }

  if (!isAuthConfigured()) {
    return res.status(500).json({
      error: '관리자 로그인이 아직 설정되지 않았습니다. backend/.env의 ADMIN_PASSWORD_HASH와 JWT_SECRET을 먼저 설정하세요.'
    });
  }

  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: '비밀번호를 입력하세요.' });
  }

  const isMatch = await bcrypt.compare(password, config.adminPasswordHash);
  if (!isMatch) {
    recordFailedAttempt(ip);
    return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
  }

  clearAttempts(ip);
  setAuthCookie(res, issueToken());
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// 프론트 관리자 페이지가 로그인 상태인지 확인할 때 호출한다.
router.get('/session', requireAdminAuth, (req, res) => {
  res.json({ authenticated: true });
});

module.exports = router;
