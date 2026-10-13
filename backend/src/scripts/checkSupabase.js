/**
 * Supabase 연결 확인용 스크립트.
 *
 * 실행:  cd backend  →  npm run check-supabase
 *
 * 하는 일은 딱 하나다. .env에 적어둔 주소와 열쇠로 Supabase에 말을 걸어보고,
 * 대답이 오는지 확인한다. 테이블을 만들거나 데이터를 바꾸지 않는다(읽기만 한다).
 */

require('dotenv').config();

const URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(message, hint) {
  console.log(`\n❌ ${message}`);
  if (hint) console.log(`   → ${hint}`);
  process.exit(1);
}

(async () => {
  console.log('Supabase 연결을 확인합니다...\n');

  // 1단계: .env에 값이 들어 있는지
  if (!URL) {
    fail('SUPABASE_URL이 비어 있습니다.', 'backend/.env 파일에 SUPABASE_URL을 채워주세요.');
  }
  if (!SERVICE_KEY) {
    fail('SUPABASE_SERVICE_ROLE_KEY가 비어 있습니다.', 'backend/.env 파일에 service_role 키를 채워주세요.');
  }
  if (!URL.startsWith('https://')) {
    fail(`SUPABASE_URL 형태가 이상합니다: ${URL}`, 'https://xxxxx.supabase.co 같은 모양이어야 합니다.');
  }
  console.log(`1) .env 값 확인       ... OK  (${URL})`);

  // 2단계: 실제로 말을 걸어본다.
  //    Supabase는 REST 주소로 요청하면 열쇠가 맞는지 바로 알려준다.
  let res;
  try {
    res = await fetch(`${URL}/rest/v1/`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
  } catch (err) {
    fail(`주소에 연결하지 못했습니다. (${err.message})`, 'SUPABASE_URL이 올바른지, 인터넷이 되는지 확인해주세요.');
  }

  if (res.status === 401 || res.status === 403) {
    fail(`열쇠가 거부되었습니다. (HTTP ${res.status})`, 'SUPABASE_SERVICE_ROLE_KEY를 다시 복사해서 넣어주세요.');
  }
  if (!res.ok) {
    fail(`예상치 못한 응답입니다. (HTTP ${res.status})`);
  }
  console.log('2) 연결 및 열쇠 확인  ... OK');

  console.log('\n✅ Supabase와 정상적으로 연결됩니다. 이제 테이블을 만들면 됩니다.\n');
})();
