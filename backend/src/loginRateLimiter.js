// 로그인 무차별 대입(brute-force) 공격을 늦추기 위한 아주 단순한 시도 횟수 제한.
// 외부 라이브러리나 별도 저장소 없이 메모리(Map)에만 기록하므로 서버를
// 재시작하면 초기화된다 — 개인용 관리자 페이지 하나를 지키는 용도로는 충분하다.
//
// 규칙: 같은 IP에서 WINDOW_MS(10분) 동안 MAX_ATTEMPTS(5회) 이상 비밀번호를
// 틀리면, 그 창이 끝날 때까지 이후 로그인 시도 자체를 막는다(429 응답).

const attempts = new Map(); // ip -> { count, firstAttemptAt }

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10분

function isWindowExpired(record) {
  return Date.now() - record.firstAttemptAt > WINDOW_MS;
}

function isLocked(ip) {
  const record = attempts.get(ip);
  if (!record) return false;

  if (isWindowExpired(record)) {
    attempts.delete(ip);
    return false;
  }

  return record.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(ip) {
  const record = attempts.get(ip);
  if (!record || isWindowExpired(record)) {
    attempts.set(ip, { count: 1, firstAttemptAt: Date.now() });
  } else {
    record.count += 1;
  }
}

function clearAttempts(ip) {
  attempts.delete(ip);
}

module.exports = { isLocked, recordFailedAttempt, clearAttempts, MAX_ATTEMPTS };
