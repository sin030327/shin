/**
 * ===========================================================================
 * POKEBALL TIMELINE — 공을 누르면 그 이력이 열린다
 * ===========================================================================
 *
 * 어떻게 동작하나요?
 *   1. 이미 HTML에 있는 이력(.timeline-row)을 읽습니다.
 *   2. 이력 개수만큼 공을 자동으로 만들어 위에 늘어놓습니다.
 *   3. 공을 누르면 흔들린 뒤 열리고, 그 이력이 아래에 나타납니다.
 *
 * ★ 이력을 추가하려면 index.html 에 .timeline-row 를 하나 더 넣기만 하면
 *   공도 자동으로 하나 늘어납니다. 이 파일은 고칠 필요가 없습니다.
 *
 * ★ 안전장치
 *   공은 이 스크립트가 만들고, 이력을 접는 것도 이 스크립트가 합니다.
 *   그래서 이 파일이 실패하면 공이 안 생기는 대신 이력이 전부 펼쳐진
 *   원래 목록 그대로 보입니다. 내용이 사라지지 않습니다.
 *
 * ★ PDF 저장 기능(script.js)은 .timeline-row 의 글자를 읽어갑니다.
 *   접을 때 요소를 지우지 않고 감추기만 하므로 PDF에는 그대로 담깁니다.
 */

(function () {
  'use strict';

  // 공 종류. 이력이 5개를 넘으면 처음부터 다시 돌아가며 쓴다.
  const VARIANTS = ['poke', 'great', 'ultra', 'master', 'premier'];

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** 요소 안의 글자를 안전하게 꺼낸다 (없으면 빈 문자열) */
  function textOf(root, selector) {
    const el = root.querySelector(selector);
    return el ? el.textContent.trim() : '';
  }

  /** 공 하나를 만든다 */
  function createBall(row, index) {
    const variant = VARIANTS[index % VARIANTS.length];

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pokeball';
    btn.dataset.variant = variant;
    btn.setAttribute('aria-expanded', 'false');

    // 어떤 이력을 여는 공인지 화면 낭독기에도 알려준다
    const title = textOf(row, '.t-title') || '이력';
    btn.setAttribute('aria-label', title + ' 이력 열기');

    const year = textOf(row, '.t-year');
    const tag = textOf(row, '.t-badge');

    // 마스터볼에만 M 표시를 넣는다
    const mark = variant === 'master' ? '<span class="pokeball__mark">M</span>' : '';

    btn.innerHTML =
      '<span class="pokeball__ball">' +
        '<span class="pokeball__half pokeball__half--top">' +
          '<span class="pokeball__accent pokeball__accent--1"></span>' +
          '<span class="pokeball__accent pokeball__accent--2"></span>' +
          mark +
          '<span class="pokeball__gloss"></span>' +
        '</span>' +
        '<span class="pokeball__half pokeball__half--bottom"></span>' +
        '<span class="pokeball__band"></span>' +
        '<span class="pokeball__btn"></span>' +
        '<span class="pokeball__flash"></span>' +
      '</span>' +
      '<span class="pokeball__meta">' +
        '<span class="pokeball__year"></span>' +
        '<span class="pokeball__tag"></span>' +
      '</span>';

    // 글자는 textContent 로 넣는다 (내용에 <, & 가 있어도 깨지지 않도록)
    btn.querySelector('.pokeball__year').textContent = year;
    btn.querySelector('.pokeball__tag').textContent = tag;

    // 공마다 떠다니는 박자를 조금씩 어긋나게 해서 자연스럽게 만든다
    btn.querySelector('.pokeball__ball').style.setProperty('--ball-delay', index * 420 + 'ms');

    return btn;
  }

  function init() {
    const list = document.querySelector('.editorial-timeline');
    if (!list) return;

    const rows = Array.from(list.querySelectorAll('.timeline-row'));
    if (!rows.length) return;

    const rack = document.createElement('div');
    rack.className = 'ball-rack';

    const hint = document.createElement('p');
    hint.className = 'ball-rack__hint';
    hint.innerHTML = '공을 <b>누르면</b> 해당 이력이 열립니다';
    rack.appendChild(hint);

    const balls = rows.map((row, i) => {
      const ball = createBall(row, i);
      rack.appendChild(ball);

      // 처음에는 전부 접어둔다 (아래에서 첫 번째만 다시 연다)
      row.classList.add('is-collapsed');

      ball.addEventListener('click', () => toggle(i));
      return ball;
    });

    list.parentNode.insertBefore(rack, list);
    document.body.classList.add('ball-mode');

    let openIndex = -1;
    let shakeTimer = null;

    function closeAll() {
      balls.forEach((b) => {
        b.classList.remove('is-open');
        b.setAttribute('aria-expanded', 'false');
      });
      rows.forEach((r) => r.classList.remove('is-popped', 'is-popping', 'is-collapsed'));
      rows.forEach((r) => r.classList.add('is-collapsed'));
    }

    /** 이력 카드를 보여준다 (아래에서 솟아오르는 연출) */
    function reveal(row) {
      row.classList.remove('is-collapsed');
      row.classList.add('is-popping');
      // 감춰진 상태에서 바로 클래스를 바꾸면 전환이 생략된다.
      // 한 프레임 쉬었다가 바꿔야 애니메이션이 보인다.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          row.classList.add('is-popped');
        });
      });
    }

    function toggle(index) {
      const ball = balls[index];
      const row = rows[index];

      // 이미 열린 공을 다시 누르면 닫는다
      if (openIndex === index) {
        closeAll();
        openIndex = -1;
        return;
      }

      closeAll();
      openIndex = index;

      window.clearTimeout(shakeTimer);
      ball.setAttribute('aria-expanded', 'true');

      if (prefersReduced) {
        ball.classList.add('is-open');
        reveal(row);
        return;
      }

      // 흔들림 → 열림 순서로 보여준다
      ball.classList.add('is-shaking');
      shakeTimer = window.setTimeout(() => {
        ball.classList.remove('is-shaking');
        ball.classList.add('is-open');
        reveal(row);
      }, 620); // pokeball.css 의 ball-shake 길이와 맞춰둔 값
    }

    // 섹션이 비어 보이지 않도록 첫 번째 이력은 열어둔다
    balls[0].classList.add('is-open');
    balls[0].setAttribute('aria-expanded', 'true');
    rows[0].classList.remove('is-collapsed');
    rows[0].classList.add('is-popped');
    openIndex = 0;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
