/**
 * Supabase가 실제로 잘 동작하는지 확인하는 스크립트.
 *
 * 실행:  cd backend  →  npm run test-supabase
 *
 * 하는 일:
 *   1) 예약을 1건 넣어보고, 다시 읽어서 값이 제대로 들어갔는지 확인
 *   2) 같은 시간에 또 넣어보고, DB가 막아주는지 확인 (중복 방지)
 *   3) 프로젝트를 1건 만들고 → 수정하고 → 지워보기
 *
 * ★ 테스트로 만든 자료는 끝나고 전부 지웁니다. DB에 쓰레기가 남지 않습니다.
 */

require('dotenv').config();

const { isSupabaseConfigured, getSupabaseAdmin } = require('../db/supabaseClient');
const store = require('../db/supabaseStore');

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(
    `${ok ? '  PASS' : '  FAIL'}  ${label}` +
    (ok ? '' : `\n        받은 값 : ${JSON.stringify(actual)}\n        기대한 값: ${JSON.stringify(expected)}`)
  );
}

// 실제 예약과 섞이지 않도록 아주 먼 미래 날짜를 쓴다.
const TEST_DATE = '2099-12-31';
const TEST_EMAIL = 'supabase-test@example.invalid';

(async () => {
  if (!isSupabaseConfigured()) {
    console.log('\n❌ .env에 Supabase 값이 없습니다.');
    console.log('   → backend/.env 의 SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 채워주세요.\n');
    process.exit(1);
  }

  const client = getSupabaseAdmin();
  const cleanup = { reservationIds: [], projectIds: [] };

  try {
    console.log('\n[1] 예약 넣고 다시 읽기');
    const saved = await store.saveReservation({
      date: TEST_DATE, time: '14:00', name: '연결테스트',
      email: TEST_EMAIL, purpose: '연결 확인용', consent: true
    });
    cleanup.reservationIds.push(saved.id);
    check('예약번호가 만들어짐', /^R-\d{8}-\d{4}-[A-Z0-9]{4}$/.test(saved.reservationNo), true);
    check('날짜가 그대로', saved.date, TEST_DATE);
    check('시간이 14:00 형태 (초가 안 붙음)', saved.time, '14:00');
    check('기본 상태는 접수', saved.statusLabel, '접수');

    console.log('\n[2] 같은 시간에 또 넣으면 DB가 막아주는지');
    let blocked = false;
    try {
      const dup = await store.saveReservation({
        date: TEST_DATE, time: '14:00', name: '다른사람',
        email: 'other@example.invalid', purpose: '중복 시도', consent: true
      });
      cleanup.reservationIds.push(dup.id);
    } catch (err) {
      blocked = err.code === 'SLOT_TAKEN';
    }
    check('중복 예약이 막힘', blocked, true);

    console.log('\n[3] 찬 시간 목록에 보이는지');
    const slots = await store.listBookedSlots();
    check('방금 넣은 시간이 목록에 있음',
      slots.some((s) => s.date === TEST_DATE && s.time === '14:00'), true);
    check('날짜/시간 외 정보는 없음',
      [...new Set(slots.flatMap(Object.keys))].sort(), ['date', 'time']);

    console.log('\n[4] 상태를 바꾸면 그 자리가 다시 열리는지');
    const updated = await store.updateReservationStatus(saved.id, 'cancelled');
    check('취소로 바뀜', updated.statusLabel, '취소');
    const after = await store.listBookedSlots();
    check('취소한 자리는 목록에서 빠짐',
      after.some((s) => s.date === TEST_DATE && s.time === '14:00'), false);

    console.log('\n[5] 프로젝트 만들기 / 수정 / 지우기');
    const created = await store.createProject({
      title: '연결 테스트 프로젝트', role: '테스트', description: '곧 지워집니다',
      date: '2099-01-01', teamSize: '3', notes: '테스트', status: 'draft'
    });
    cleanup.projectIds.push(created.id);
    check('만들어짐', created.title, '연결 테스트 프로젝트');
    check('역할(role)이 저장됨', created.role, '테스트');
    check('참여인원이 저장됨', created.teamSize, '3');
    check('날짜가 저장됨', created.date, '2099-01-01');

    const edited = await store.updateProject(created.id, {
      title: '수정됨', role: '테스트', description: '수정', date: '', teamSize: '', notes: '',
      status: 'published'
    });
    check('수정됨', edited.title, '수정됨');
    check('빈 날짜는 빈 값으로 처리', edited.date, '');
    check('빈 인원수도 빈 값으로 처리', edited.teamSize, '');

    const publicList = await store.listPublishedProjects();
    check('공개 목록에 보임', publicList.some((p) => p.id === created.id), true);

    check('지워짐', await store.deleteProject(created.id), true);
    cleanup.projectIds = [];
    check('없는 걸 지우면 false', await store.deleteProject(created.id), false);
  } catch (err) {
    failures++;
    console.error('\n오류가 났습니다:', err.message);
    console.error('  (테이블을 아직 안 만들었거나, 03_patch.sql을 안 돌렸을 수 있습니다)');
  } finally {
    // 테스트로 만든 자료 정리
    if (cleanup.reservationIds.length) {
      await client.from('reservations').delete().in('id', cleanup.reservationIds);
    }
    if (cleanup.projectIds.length) {
      await client.from('projects').delete().in('id', cleanup.projectIds);
    }
    await client.from('reservations').delete().eq('visit_date', TEST_DATE);
    console.log('\n테스트로 만든 자료는 모두 지웠습니다.');

    if (failures === 0) {
      console.log('\n✅ 전부 통과했습니다. 웹사이트가 Supabase에 제대로 연결되었습니다.\n');
    } else {
      console.log(`\n❌ ${failures}개 항목이 실패했습니다. 위 내용을 그대로 복사해서 알려주세요.\n`);
    }
    process.exit(failures === 0 ? 0 : 1);
  }
})();
