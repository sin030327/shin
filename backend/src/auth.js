// 관리자 로그인 세션을 다루는 모듈.
// 비밀번호(원문/해시 모두)는 이 파일 밖으로 절대 응답에 담아 내보내지 않는다.
// 로그인에 성공하면 서명된 JWT를 httpOnly 쿠키로 내려주고, 이후 요청은
// 이 쿠키만으로 인증 여부를 판단한다 (프론트엔드 JS는 토큰 값 자체를 알 수 없다).

const jwt = require('jsonwebtoken');
const config = require('./config');

const COOKIE_NAME = 'admin_token';
const TOKEN_TTL = '12h';
const COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function isAuthConfigured() {
  return Boolean(config.adminPasswordHash && config.jwtSecret);
}

function issueToken() {
  return jwt.sign({ role: 'admin' }, config.jwtSecret, { expiresIn: TOKEN_TTL });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    return null;
  }
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

/** 관리자 전용 라우트 앞에 붙이는 미들웨어. 인증 안 됐으면 401로 막는다. */
function requireAdminAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  const payload = token && verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  next();
}

module.exports = {
  isAuthConfigured,
  issueToken,
  setAuthCookie,
  clearAuthCookie,
  requireAdminAuth
};
