// 관리자 비밀번호의 bcrypt 해시를 생성하는 도구.
// 사용법: npm run hash-password -- "원하는비밀번호"
// 출력된 값을 backend/.env 의 ADMIN_PASSWORD_HASH 에 붙여넣으면 된다.
const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('사용법: npm run hash-password -- "원하는비밀번호"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log('\nADMIN_PASSWORD_HASH에 아래 값을 붙여넣으세요:\n');
console.log(hash);
console.log('');
