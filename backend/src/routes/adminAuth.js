const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { isAuthConfigured, issueToken, setAuthCookie, clearAuthCookie, requireAdminAuth } = require('../auth');

const router = express.Router();

router.post('/login', async (req, res) => {
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
    return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
  }

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
