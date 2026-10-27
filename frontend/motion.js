/**
 * ===========================================================================
 * MOTION ENGINE — 스크롤 / 마우스 연출 모음
 * ===========================================================================
 *
 * 안전장치 (중요)
 *   요소를 숨기는 data-reveal 속성을 "HTML에 직접 쓰지 않고" 이 파일이 붙입니다.
 *   그래서 이 스크립트가 실패하거나 차단돼도 글이 사라지지 않고 그냥 다 보입니다.
 *   (HTML에 미리 숨겨두면, JS가 멈췄을 때 백지 화면이 됩니다.)
 *
 * 연출 목록
 *   01 스크롤 진행 바          07 글자 해독(스크램블) 효과
 *   02 등장 애니메이션 + 순차   08 카드 위 스포트라이트
 *   03 제목 글자 하나씩 솟기    09 프로젝트 카드 3D 기울임
 *   04 마퀴 복제 + 속도 반응    10 버튼 물결(ripple)
 *   05 숫자 올라가기            11 옆쪽 챕터 표시줄
 *   06 자석 버튼 / 패럴랙스     12 커서 확대
 *
 * 연출을 끄고 싶으면 맨 아래 boot() 에서 해당 줄만 지우면 됩니다.
 */

(function () {
  'use strict';

  // 움직임을 불편해하는 사용자는 연출을 모두 끈다 (접근성 설정 존중)
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;

  /** 스크롤 이벤트를 화면 주사율에 맞춰 한 번만 처리하도록 묶어주는 도우미 */
  function onScroll(fn) {
    let ticking = false;
    const run = () => {
      fn();
      ticking = false;
    };
    window.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(run);
      },
      { passive: true }
    );
    fn();
  }

  /**
   * 어떤 요소를, 어떤 방향으로, 얼마씩 늦춰서 등장시킬지 정하는 표.
   *   type : up | fade | left | right | zoom | wipe
   */
  const REVEAL_RULES = [
    { selector: '.scene-meta-header', type: 'fade', stagger: 0 },
    { selector: '.section-title-wrapper', type: 'up', stagger: 0 },
    { selector: '.projects-header', type: 'up', stagger: 0 },
    { selector: '.editorial-filters', type: 'up', stagger: 0 },
    { selector: '.hero-split-grid > .panel-box', type: 'up', stagger: 140 },
    { selector: '.stat-strip__item', type: 'up', stagger: 90 },
    { selector: '.about-panels-grid > .about-item-panel', type: 'up', stagger: 110 },
    { selector: '.skills-matrix-grid > .skill-col-panel', type: 'up', stagger: 120 },
    { selector: '.stories-grid > .story-card', type: 'up', stagger: 100 },
    // 이력(.timeline-row)은 pokeball.js 가 여닫으므로 여기서 다루지 않는다.
    { selector: '.contact-editorial-grid > .panel-box', type: 'up', stagger: 140 },
    { selector: '.footer-sub-grid > .f-col', type: 'up', stagger: 80 },
    { selector: '.footer-huge-sign', type: 'up', stagger: 0 },
  ];

  /* =====================================================================
     01. 스크롤 진행 바
     ===================================================================== */
  function initScrollProgress() {
    const bar = document.querySelector('.scroll-progress__bar');
    if (!bar) return;

    onScroll(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, ratio)) + ')';
    });
  }

  /* =====================================================================
     02. 등장 애니메이션
     ===================================================================== */
  function initReveal() {
    const targets = [];

    REVEAL_RULES.forEach((rule) => {
      document.querySelectorAll(rule.selector).forEach((el, index) => {
        if (el.hasAttribute('data-reveal')) return;

        // data-tilt 요소는 script.js가 transform을 직접 건드린다.
        // 움직임이 충돌하지 않도록 투명도만 바꾸는 fade로 처리한다.
        const type = el.hasAttribute('data-tilt') ? 'fade' : rule.type;

        el.setAttribute('data-reveal', type);
        if (rule.stagger) {
          el.style.setProperty('--reveal-delay', index * rule.stagger + 'ms');
        }
        targets.push(el);
      });
    });

    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target); // 한 번만 재생
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    targets.forEach((el) => observer.observe(el));

    // 안전장치: 관찰이 어떤 이유로든 동작하지 않으면 4초 뒤 전부 보여준다.
    window.setTimeout(() => targets.forEach((el) => el.classList.add('is-in')), 4000);
  }

  /* =====================================================================
     03. 제목 — 글자를 하나씩 쪼개 아래에서 솟아오르게 한다
     ===================================================================== */

  /** 자식 태그(<span class="title-dim"> 등)를 보존한 채 글자만 감싼다 */
  function wrapChars(root, state) {
    Array.from(root.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        Array.from(node.textContent).forEach((ch) => {
          const span = document.createElement('span');
          span.className = 'char';
          span.textContent = ch;
          span.style.setProperty('--char-delay', state.i * 26 + 'ms');
          state.i += 1;
          frag.appendChild(span);
        });
        node.replaceWith(frag);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        wrapChars(node, state);
      }
    });
  }

  function initHeadlines() {
    const headlines = document.querySelectorAll(
      '.title-line, .title-subline, .editorial-title, .projects-title, .gate-main-title'
    );

    headlines.forEach((el) => {
      if (el.querySelector('.char-line')) return; // 중복 처리 방지
      if (!el.textContent.trim()) return;

      el.innerHTML = '<span class="char-line">' + el.innerHTML + '</span>';
      wrapChars(el.firstChild, { i: 0 });
    });

    const lines = document.querySelectorAll('.char-line');
    if (!lines.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.25 }
    );

    lines.forEach((l) => observer.observe(l));
    window.setTimeout(() => lines.forEach((l) => l.classList.add('is-in')), 4000);
  }

  /* =====================================================================
     04. 마퀴 — 끊김 없이 흐르고, 스크롤 속도에 반응한다
     ===================================================================== */
  function initMarquee() {
    const tracks = document.querySelectorAll('.marquee__track');
    if (!tracks.length) return;

    tracks.forEach((track) => {
      if (track.dataset.cloned === 'true') return;
      track.innerHTML += track.innerHTML; // 두 벌 → -50% 이동이 자연스럽게 반복
      track.dataset.cloned = 'true';
    });

    if (prefersReduced) return;

    // 빠르게 스크롤할수록 빨라지고 살짝 기울어진다.
    const marquees = document.querySelectorAll('.marquee');
    let lastY = window.scrollY;

    onScroll(() => {
      const delta = window.scrollY - lastY;
      lastY = window.scrollY;

      const speedUp = Math.min(Math.abs(delta) / 14, 3); // 과하지 않게 상한을 둔다
      const skew = Math.max(-2.4, Math.min(2.4, delta * 0.06));

      marquees.forEach((m) => {
        m.style.setProperty('--marquee-speed', (34 / (1 + speedUp)).toFixed(2) + 's');
        m.style.setProperty('--marquee-skew', skew.toFixed(2) + 'deg');
      });
    });
  }

  /* =====================================================================
     05. 숫자 올라가기
     ===================================================================== */
  function initCounters() {
    const nums = document.querySelectorAll('[data-count]');
    if (!nums.length) return;

    if (prefersReduced) {
      nums.forEach((el) => {
        el.textContent = el.dataset.count;
      });
      return;
    }

    nums.forEach((el) => {
      el.textContent = '0';
    });

    const animate = (el) => {
      const target = Number(el.dataset.count);
      if (!Number.isFinite(target)) return;

      const duration = 1400;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p); // 끝으로 갈수록 느려짐
        el.textContent = String(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animate(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );

    nums.forEach((el) => observer.observe(el));
  }

  /* =====================================================================
     06. 자석 버튼 / 패럴랙스
     ===================================================================== */
  function initMagnetic() {
    if (!canHover) return;

    document.querySelectorAll('.circle-arrow, .santioni-btn').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        btn.style.transform = 'translate(' + dx * 0.28 + 'px,' + dy * 0.28 + 'px)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  function initParallax() {
    const items = document.querySelectorAll('[data-parallax]');
    if (!items.length) return;

    onScroll(() => {
      const mid = window.innerHeight / 2;
      items.forEach((el) => {
        const speed = Number(el.dataset.parallax) || 0.12;
        const rect = el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const offset = (rect.top + rect.height / 2 - mid) * speed;
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
    });
  }

  /* =====================================================================
     07. 글자 해독(스크램블) — 영문 라벨이 지직거리다 제자리를 찾는다
     ===================================================================== */
  function initScramble() {
    const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#$%&';
    // 영문 라벨에만 적용한다 (한글은 글자가 깨져 보여서 제외)
    const labels = document.querySelectorAll('.meta-label, .panel-tag, .projects-eyebrow');

    const scramble = (el) => {
      const finalText = el.dataset.finalText || el.textContent;
      el.dataset.finalText = finalText;

      const chars = Array.from(finalText);
      const total = 28; // 전체 프레임 수
      let frame = 0;

      const tick = () => {
        const progress = frame / total;
        el.textContent = chars
          .map((ch, i) => {
            if (ch === ' ' || ch === ' ') return ch; // 일반 공백과 줄바꿈 없는 공백은 그대로
            // 앞글자부터 차례로 확정된다
            if (i / chars.length < progress) return ch;
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join('');

        frame += 1;
        if (frame <= total) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = finalText; // 반드시 원래 글자로 되돌린다
        }
      };
      requestAnimationFrame(tick);

      // 안전장치: 탭을 숨기면 requestAnimationFrame 이 멈춘다.
      // 그대로 두면 글자가 깨진 채 남으므로, 1.5초 뒤에는 무조건 원래대로 되돌린다.
      window.setTimeout(() => {
        el.textContent = finalText;
      }, 1500);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          scramble(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.8 }
    );

    labels.forEach((el) => observer.observe(el));
  }

  /* =====================================================================
     08. 카드 위를 따라다니는 빛
     ===================================================================== */
  function initSpotlight() {
    if (!canHover) return;

    const cards = document.querySelectorAll(
      '.story-card, .about-item-panel, .skill-col-panel, .contact-editorial-grid > .panel-box'
    );

    cards.forEach((card) => {
      card.classList.add('spotlight');
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', e.clientX - rect.left + 'px');
        card.style.setProperty('--my', e.clientY - rect.top + 'px');
      });
    });
  }

  /* =====================================================================
     09. 프로젝트 카드 3D 기울임
     ===================================================================== */
  function initCardTilt() {
    if (!canHover) return;

    document.querySelectorAll('.stories-grid > .story-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        // 카드 중심을 0으로 두고 -0.5 ~ 0.5 범위로 바꾼다
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;

        card.style.transform =
          'translateY(-8px) rotateX(' + (-py * 9).toFixed(2) + 'deg)' +
          ' rotateY(' + (px * 9).toFixed(2) + 'deg)';
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* =====================================================================
     10. 버튼 물결(ripple)
     ===================================================================== */
  function initRipple() {
    const selector = '.santioni-btn, .santioni-action-btn, .ed-filter-btn, .gate-btn, .circle-arrow';

    document.addEventListener('click', (e) => {
      const btn = e.target.closest(selector);
      if (!btn) return;

      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;

      const dot = document.createElement('span');
      dot.className = 'ripple';
      dot.style.width = dot.style.height = size + 'px';
      dot.style.left = e.clientX - rect.left + 'px';
      dot.style.top = e.clientY - rect.top + 'px';

      // 버튼 안쪽을 기준으로 퍼져야 하므로 position 이 static 이면 바꿔준다
      if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';

      btn.appendChild(dot);
      window.setTimeout(() => dot.remove(), 700);
    });
  }

  /* =====================================================================
     11. 옆쪽 챕터 표시줄 — 지금 보고 있는 장(章)을 알려준다
     ===================================================================== */
  function initChapterRail() {
    const sections = Array.from(document.querySelectorAll('main .scene[id]'));
    if (sections.length < 2) return;

    const rail = document.createElement('div');
    rail.className = 'chapter-rail';
    rail.setAttribute('aria-hidden', 'true');

    const dots = sections.map((section, i) => {
      const dot = document.createElement('span');
      dot.className = 'chapter-rail__dot';
      dot.textContent = String(i + 1).padStart(2, '0');
      rail.appendChild(dot);
      return dot;
    });

    document.body.appendChild(rail);

    onScroll(() => {
      const line = window.innerHeight * 0.4;
      let active = 0;
      sections.forEach((section, i) => {
        if (section.getBoundingClientRect().top <= line) active = i;
      });

      dots.forEach((d, i) => d.classList.toggle('is-active', i === active));
      // 히어로를 지난 뒤부터 보여준다
      rail.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.6);
      // 밝은 띠 위에서는 글자색을 뒤집는다
      rail.classList.toggle('on-light', sections[active].classList.contains('scene--light'));
    });
  }

  /* =====================================================================
     12. 커서 확대 — 누를 수 있는 것 위에서 원이 커진다
     ===================================================================== */
  function initCursorGrow() {
    if (!canHover) return;
    if (!document.getElementById('custom-cursor')) return;

    const grow = () => document.body.classList.add('cursor-grow');
    const shrink = () => document.body.classList.remove('cursor-grow');

    document.querySelectorAll('a, button, .story-card, .ed-filter-btn').forEach((el) => {
      el.addEventListener('mouseenter', grow);
      el.addEventListener('mouseleave', shrink);
    });
  }

  /* =====================================================================
     헤더 — 조금만 내려가도 배경을 더 짙게
     ===================================================================== */
  function initHeaderState() {
    const header = document.getElementById('header-menu');
    if (!header) return;
    onScroll(() => header.classList.toggle('is-stuck', window.scrollY > 40));
  }

  /* ===================================================================== */
  function boot() {
    // 움직임 설정과 무관하게 항상 켜는 것
    initScrollProgress();
    initMarquee();
    initCounters();
    initHeaderState();

    if (prefersReduced) return;

    initHeadlines();
    initReveal();
    initScramble();
    initSpotlight();
    initCardTilt();
    initMagnetic();
    initParallax();
    initRipple();
    initChapterRail();
    initCursorGrow();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
