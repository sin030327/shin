/**
 * ===========================================================================
 * MOTION ENGINE — 스크롤 연출 모음
 * ===========================================================================
 *
 * 안전장치 (중요)
 *   요소를 숨기는 data-reveal 속성을 "HTML에 직접 쓰지 않고" 이 파일이 붙입니다.
 *   그래서 이 스크립트가 실패하거나 차단돼도 글이 사라지지 않고 그냥 다 보입니다.
 *   (HTML에 미리 숨겨두면, JS가 멈췄을 때 백지 화면이 됩니다.)
 *
 * 연출 목록
 *   1) 스크롤 진행 바          5) 숫자 올라가기
 *   2) 등장 애니메이션 + 순차   6) 자석 버튼
 *   3) 큰 제목 줄 단위 등장     7) 패럴랙스
 *   4) 마퀴(흐르는 글자) 복제   8) 헤더 축소
 *
 * 추가/수정하려면 아래 REVEAL_RULES 배열만 고치면 됩니다.
 */

(function () {
  'use strict';

  // 움직임을 불편해하는 사용자는 연출을 모두 끈다 (접근성 설정 존중)
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * 어떤 요소를, 어떤 방향으로, 얼마씩 늦춰서 등장시킬지 정하는 표.
   *   selector : 대상
   *   type     : up | fade | left | right | zoom | wipe
   *   stagger  : 형제 요소끼리 몇 ms씩 차이를 둘지 (0이면 동시에)
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
    { selector: '.editorial-timeline > .timeline-row', type: 'up', stagger: 110 },
    { selector: '.contact-editorial-grid > .panel-box', type: 'up', stagger: 140 },
    { selector: '.footer-sub-grid > .f-col', type: 'up', stagger: 80 },
    { selector: '.footer-huge-sign', type: 'up', stagger: 0 },
  ];

  /* ---------------------------------------------------------------------
     1) 스크롤 진행 바 — 페이지를 얼마나 내려왔는지 위쪽 주황 선으로 표시
     --------------------------------------------------------------------- */
  function initScrollProgress() {
    const bar = document.querySelector('.scroll-progress__bar');
    if (!bar) return;

    let ticking = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, ratio)) + ')';
      ticking = false;
    };

    window.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );
    update();
  }

  /* ---------------------------------------------------------------------
     2) 등장 애니메이션
     --------------------------------------------------------------------- */
  function initReveal() {
    const targets = [];

    REVEAL_RULES.forEach((rule) => {
      const nodes = document.querySelectorAll(rule.selector);
      nodes.forEach((el, index) => {
        if (el.hasAttribute('data-reveal')) return; // 이미 등록된 요소는 건너뛴다

        // data-tilt 요소는 script.js가 transform을 직접 건드리므로,
        // 움직임이 서로 충돌하지 않도록 투명도만 바꾸는 fade로 처리한다.
        const type = el.hasAttribute('data-tilt') ? 'fade' : rule.type;

        el.setAttribute('data-reveal', type);
        if (rule.stagger) {
          el.style.setProperty('--reveal-delay', index * rule.stagger + 'ms');
        }
        targets.push(el);
      });
    });

    if (!targets.length) return;

    // 화면 아래쪽 12% 지점에 닿으면 등장시킨다 (너무 일찍 뜨지 않도록)
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

    // 안전장치: 어떤 이유로든 관찰이 동작하지 않으면 4초 뒤 전부 보여준다.
    window.setTimeout(() => {
      targets.forEach((el) => el.classList.add('is-in'));
    }, 4000);
  }

  /* ---------------------------------------------------------------------
     3) 큰 제목 — 줄을 띠로 감싸고 아래에서 밀어 올린다
     --------------------------------------------------------------------- */
  function initHeadlines() {
    const headlines = document.querySelectorAll(
      '.title-line, .title-subline, .editorial-title, .projects-title, .gate-main-title'
    );

    headlines.forEach((el) => {
      if (el.querySelector('.line-mask')) return; // 중복 처리 방지
      if (!el.textContent.trim()) return;

      // 안쪽 마크업(<span class="title-dim"> 같은 강조)을 그대로 살린 채
      // 바깥만 띠로 한 겹 감싼다. 그래야 글자색 강조와 등장 연출을 같이 쓸 수 있다.
      el.innerHTML = '<span class="line-mask"><span>' + el.innerHTML + '</span></span>';
    });

    const masks = document.querySelectorAll('.line-mask');
    if (!masks.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    masks.forEach((m, i) => {
      m.style.setProperty('--line-delay', (i % 3) * 90 + 'ms');
      observer.observe(m);
    });

    window.setTimeout(() => {
      masks.forEach((m) => m.classList.add('is-in'));
    }, 4000);
  }

  /* ---------------------------------------------------------------------
     4) 마퀴 — 끊김 없이 흐르도록 내용을 한 벌 더 복제한다
     --------------------------------------------------------------------- */
  function initMarquee() {
    document.querySelectorAll('.marquee__track').forEach((track) => {
      if (track.dataset.cloned === 'true') return;
      track.innerHTML += track.innerHTML; // 같은 내용 두 벌 → -50% 이동이 자연스럽게 반복
      track.dataset.cloned = 'true';
    });
  }

  /* ---------------------------------------------------------------------
     5) 숫자 올라가기 — 0에서 목표 숫자까지 세어 올린다
     --------------------------------------------------------------------- */
  function animateCount(el) {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;

    const duration = 1400;
    const start = performance.now();

    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      // 끝으로 갈수록 느려지는 곡선 (easeOutExpo)
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

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

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );

    nums.forEach((el) => observer.observe(el));
  }

  /* ---------------------------------------------------------------------
     6) 자석 버튼 — 마우스를 따라 살짝 끌려온다
     --------------------------------------------------------------------- */
  function initMagnetic() {
    if (prefersReduced) return;
    // 손가락으로 쓰는 기기에서는 의미가 없으므로 건너뛴다.
    if (!window.matchMedia('(hover: hover)').matches) return;

    document.querySelectorAll('.circle-arrow, .santioni-btn').forEach((btn) => {
      const strength = 0.28;

      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        btn.style.transform = 'translate(' + dx * strength + 'px,' + dy * strength + 'px)';
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  /* ---------------------------------------------------------------------
     7) 패럴랙스 — 스크롤보다 느리게 움직여 깊이감을 준다
     --------------------------------------------------------------------- */
  function initParallax() {
    if (prefersReduced) return;

    const items = document.querySelectorAll('[data-parallax]');
    if (!items.length) return;

    let ticking = false;
    const update = () => {
      const mid = window.innerHeight / 2;
      items.forEach((el) => {
        const speed = Number(el.dataset.parallax) || 0.12;
        const rect = el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return; // 화면 밖은 계산 생략
        const offset = (rect.top + rect.height / 2 - mid) * speed;
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
      ticking = false;
    };

    window.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );
    update();
  }

  /* ---------------------------------------------------------------------
     8) 헤더 — 조금만 내려가도 배경을 더 짙게
     --------------------------------------------------------------------- */
  function initHeaderState() {
    const header = document.getElementById('header-menu');
    if (!header) return;

    const update = () => header.classList.toggle('is-stuck', window.scrollY > 40);
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* --------------------------------------------------------------------- */
  function boot() {
    initScrollProgress();
    initMarquee();
    initCounters();
    initHeaderState();

    // 움직임을 끈 사용자에게는 등장/자석/패럴랙스를 적용하지 않는다.
    if (prefersReduced) return;

    initHeadlines();
    initReveal();
    initMagnetic();
    initParallax();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
