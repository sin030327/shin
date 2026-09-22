/**
 * SHIN JAEHOON // THE SANTIONI SPIRITS PORTFOLIO SCRIPT
 * Web Audio, Interactive 3D Tilt, Custom Cursor & Gate Logic
 */

// 백엔드 API 서버 주소.
// backend(../backend)를 로컬에서 함께 실행해 두면 연락처 폼이 실제로 이 주소에 전송된다.
// 백엔드가 꺼져 있거나(현재 배포된 사이트가 이 경우) 응답이 없으면, 아래 연락처 폼 로직이
// 자동으로 기존 화면 시뮬레이션 방식으로 대체되므로 백엔드 없이도 사이트는 정상 동작한다.
const API_BASE_URL = 'http://localhost:4000';

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // 1. Cinematic Gate & Access Control (Santioni Style)
  // ==========================================================================
  const ACCESS_PASSWORD = '1234'; // Default Passcode

  const gateScreen = document.getElementById('gate-screen');
  const gateForm = document.getElementById('gate-form');
  const gatePassword = document.getElementById('gate-password');
  const gateErrorMsg = document.getElementById('gate-error-msg');
  const gateBox = document.querySelector('.gate-box');
  const gateToggleEye = document.getElementById('gate-toggle-eye');
  const gateEyeIcon = document.getElementById('gate-eye-icon');
  const lockBtn = document.getElementById('lock-btn');

  // Check Session Auth
  const isUnlocked = sessionStorage.getItem('isPortfolioUnlocked') === 'true';

  if (isUnlocked && gateScreen) {
    unlockGate(false);
  }

  if (gateForm) {
    gateForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const entered = gatePassword.value.trim();

      if (entered === ACCESS_PASSWORD) {
        unlockGate(true);
      } else {
        triggerGateError();
      }
    });
  }

  if (gateToggleEye) {
    gateToggleEye.addEventListener('click', () => {
      const isPw = gatePassword.getAttribute('type') === 'password';
      gatePassword.setAttribute('type', isPw ? 'text' : 'password');
      gateEyeIcon.className = isPw ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
    });
  }

  function unlockGate(isInteractive = true) {
    sessionStorage.setItem('isPortfolioUnlocked', 'true');
    gateScreen.classList.add('gate-unlocked');
    document.body.classList.remove('locked-state');

    if (isInteractive) {
      playSuccessSound();
      showToast('ACCESS GRANTED // WELCOME TO THE EXPERIENCE');
    }
  }

  function triggerGateError() {
    playErrorSound();
    gateErrorMsg.classList.add('show');
    gateBox.classList.remove('shake');
    void gateBox.offsetWidth; // Trigger reflow
    gateBox.classList.add('shake');
    gatePassword.value = '';
    gatePassword.focus();
  }

  if (lockBtn) {
    lockBtn.addEventListener('click', () => {
      sessionStorage.removeItem('isPortfolioUnlocked');
      gateScreen.classList.remove('gate-unlocked');
      document.body.classList.add('locked-state');
      gateErrorMsg.classList.remove('show');
      gatePassword.value = '';
      showToast('PORTFOLIO SECURED // LOCKED');
    });
  }

  // ==========================================================================
  // 2. Web Audio Synthesizer & Soundscape (Santioni Audio Experience)
  // ==========================================================================
  let audioCtx = null;
  let isSoundActive = false;
  let ambientOscillators = [];
  let ambientGainNode = null;

  const soundToggleBtn = document.getElementById('sound-toggle');
  const soundStatusText = document.getElementById('sound-status');

  function initAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function startAmbience() {
    initAudioContext();
    if (ambientOscillators.length > 0) return;

    ambientGainNode = audioCtx.createGain();
    ambientGainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
    ambientGainNode.gain.exponentialRampToValueAtTime(0.06, audioCtx.currentTime + 3);
    ambientGainNode.connect(audioCtx.destination);

    // Ethereal chord frequencies (D minor / A / F)
    const freqs = [146.83, 220.00, 261.63, 349.23];

    freqs.forEach(freq => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      osc.connect(ambientGainNode);
      osc.start();
      ambientOscillators.push(osc);
    });
  }

  function stopAmbience() {
    if (ambientGainNode && audioCtx) {
      ambientGainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1);
      setTimeout(() => {
        ambientOscillators.forEach(osc => osc.stop());
        ambientOscillators = [];
      }, 1000);
    }
  }

  function playUiClickSound() {
    if (!isSoundActive || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    } catch (e) {}
  }

  function playSuccessSound() {
    try {
      initAudioContext();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {}
  }

  function playErrorSound() {
    try {
      initAudioContext();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, audioCtx.currentTime);
      osc.frequency.setValueAtTime(120, audioCtx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {}
  }

  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      isSoundActive = !isSoundActive;
      if (isSoundActive) {
        startAmbience();
        soundToggleBtn.classList.add('playing');
        soundStatusText.textContent = 'ON';
        showToast('SOUND EXPERIENCE: ACTIVATED');
      } else {
        stopAmbience();
        soundToggleBtn.classList.remove('playing');
        soundStatusText.textContent = 'OFF';
        showToast('SOUND EXPERIENCE: MUTED');
      }
    });
  }

  // Bind UI sounds to all clickable elements
  document.querySelectorAll('a, button, .ed-filter-btn').forEach(elem => {
    elem.addEventListener('click', () => {
      playUiClickSound();
    });
  });

  // ==========================================================================
  // 3. Custom Magnetic Cursor
  // ==========================================================================
  const customCursor = document.getElementById('custom-cursor');

  if (customCursor) {
    window.addEventListener('mousemove', (e) => {
      customCursor.style.left = `${e.clientX}px`;
      customCursor.style.top = `${e.clientY}px`;
    });

    const interactiveElements = document.querySelectorAll('a, button, input, textarea, .panel-box, .sound-toggle');
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', () => customCursor.classList.add('hovered'));
      el.addEventListener('mouseleave', () => customCursor.classList.remove('hovered'));
    });
  }

  // ==========================================================================
  // 4. Interactive 3D Tilt on Panels
  // ==========================================================================
  const tiltPanels = document.querySelectorAll('[data-tilt]');

  tiltPanels.forEach(panel => {
    panel.addEventListener('mousemove', (e) => {
      const rect = panel.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;

      panel.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
    });

    panel.addEventListener('mouseleave', () => {
      panel.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });

  // ==========================================================================
  // 5. Hero Dynamic Typing
  // ==========================================================================
  const typingTextEl = document.getElementById('typing-text');
  const manifestoPhrases = [
    'Clean Architecture & Modular Systems',
    'Interactive Frontends with Depth',
    'Robust Backend REST APIs & Databases',
    'SangMyung Univ. Software Engineer'
  ];
  let phraseIdx = 0;
  let charIdx = 0;
  let isBackspacing = false;

  function handleTyping() {
    if (!typingTextEl) return;
    const current = manifestoPhrases[phraseIdx];

    if (isBackspacing) {
      typingTextEl.textContent = current.substring(0, charIdx - 1);
      charIdx--;
    } else {
      typingTextEl.textContent = current.substring(0, charIdx + 1);
      charIdx++;
    }

    let delay = isBackspacing ? 40 : 80;

    if (!isBackspacing && charIdx === current.length) {
      delay = 2000;
      isBackspacing = true;
    } else if (isBackspacing && charIdx === 0) {
      isBackspacing = false;
      phraseIdx = (phraseIdx + 1) % manifestoPhrases.length;
      delay = 400;
    }

    setTimeout(handleTyping, delay);
  }
  handleTyping();

  // ==========================================================================
  // 6. Navigation Scrollspy & Mobile Menu
  // ==========================================================================
  const navLinks = document.querySelectorAll('.header-nav .nav-item');
  const mobileToggle = document.getElementById('mobile-toggle');
  const headerNav = document.querySelector('.header-nav');

  window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY + 200;
    const scenes = document.querySelectorAll('.scene');

    scenes.forEach(scene => {
      const top = scene.offsetTop;
      const height = scene.offsetHeight;
      const id = scene.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('data-target') === id) {
            link.classList.add('active');
          }
        });
      }
    });
  });

  if (mobileToggle && headerNav) {
    mobileToggle.addEventListener('click', () => {
      headerNav.classList.toggle('mobile-open');
    });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        headerNav.classList.remove('mobile-open');
      });
    });
  }

  // ==========================================================================
  // 7. Project Stories Data & Modal Logic
  // ==========================================================================
  const projectStories = {
    1: {
      vol: 'VOL. 01',
      cat: 'CAMPUS DEVELOPMENT',
      title: '상명대 스터디룸 예약 및 캘린더 플랫폼',
      desc: '상명대학교 학생들의 팀 프로젝트 및 동아리 스터디 모임을 원활하게 지원하기 위해 개발한 실시간 예약 플랫폼입니다. 학내 빈 강의실과 스터디룸 현황을 확인하고 중복 예약 없이 손쉽게 예약할 수 있도록 구현했습니다.',
      features: [
        'React 기반의 시각적 타임테이블 및 캘린더 인터페이스 구현',
        'Node.js / Express를 이용한 RESTful API 엔드포인트 구축',
        '동시성 예약 충돌을 방지하기 위한 MySQL 트랜잭션 격리 수준 적용',
        '모바일 최적화 반응형 레이아웃 설계'
      ],
      tags: ['React', 'Node.js', 'Express', 'MySQL', 'CSS Modules'],
      github: 'https://github.com/sin030327/shin'
    },
    2: {
      vol: 'VOL. 02',
      cat: 'DEV ARCHIVE & LOG',
      title: '알고리즘 풀이 & 개발 지식 아카이빙 블로그',
      desc: '자료구조, 알고리즘 풀이 및 전공 수업에서 배운 핵심 웹 기술들을 체계적으로 아카이빙하고 복습하기 위해 직접 구축한 개인 기술 블로그 플랫폼입니다.',
      features: [
        '마크다운(Markdown) 실시간 파싱 및 코드 신택스 하이라이팅 연동',
        '카테고리별/태그별 아티클 검색 및 필터링 기능',
        '브라우저 LocalStorage 기반 임시 저장 및 테마 설정 지속화',
        '시맨틱 태그 구조 및 검색 엔진 최적화(SEO) 반영'
      ],
      tags: ['JavaScript', 'HTML5/CSS3', 'LocalStorage', 'Markdown Parser'],
      github: 'https://github.com/sin030327/shin'
    },
    3: {
      vol: 'VOL. 03',
      cat: 'STUDY LAB & RESEARCH',
      title: '전공 강의 핵심 요약 및 퀴즈 생성 어시스턴트',
      desc: '방대한 양의 전공 시험 범위를 효율적으로 복습할 수 있도록 강의 텍스트에서 주요 용어를 추출하고 맞춤형 4지선다 퀴즈를 생성해주는 학습 보조 웹 도구입니다.',
      features: [
        'FastAPI 기반 가볍고 빠른 비동기 텍스트 처리 백엔드 서버',
        '전공 텍스트 구문 분석 및 핵심 키워드 요약 파이프라인',
        'React 기반의 대화형 퀴즈 인터페이스 및 오답 노트 대시보드',
        '학습 정리 결과 PDF 및 텍스트 파일 내보내기 지원'
      ],
      tags: ['Python', 'FastAPI', 'React', 'REST API'],
      github: 'https://github.com/sin030327/shin'
    },
    4: {
      vol: 'VOL. 04',
      cat: 'PRODUCTIVITY TOOL',
      title: '몰입형 집중 타이머 & 칸반 할 일 관리 보드',
      desc: '일일 공부 계획과 개발 작업의 몰입도를 극대화하기 위해 뽀모도로(Pomodoro) 기법 타이머와 드래그 앤 드롭 방식의 칸반 보드를 결합한 웹 애플리케이션입니다.',
      features: [
        'Vanilla JS HTML5 Drag and Drop API를 활용한 카드 이동',
        '집중 시간(25분) 및 휴식 시간(5분) 맞춤 오디오 알림 연동',
        '일자별 순수 집중 시간 기록 및 통계 데이터 보관',
        '눈의 피로를 최소화하는 정교한 다크 에디토리얼 UI'
      ],
      tags: ['Vanilla JS', 'Drag & Drop API', 'Web Audio API', 'CSS Grid'],
      github: 'https://github.com/sin030327/shin'
    },
    5: {
      vol: 'VOL. 05',
      cat: '조경 설계 공모전',
      title: '습지를 담은 숲 — 도시숲 설계 공모전',
      desc: '서울 용산구 이촌동, 용산공원과 한강 사이에서 끊어진 생태축을 회복하는 도시숲 설계 공모전 출품작입니다. 팀 프로젝트로 참여해 마스터플랜 제작을 맡았습니다.',
      features: [
        '용산공원-이촌-한강을 잇는 생태축 회복 콘셉트 설계',
        '생태-완충-이용-체험-관리 순으로 이어지는 조닝 전략 수립',
        '습지를 중심에 두고 숲을 조성하는 마스터플랜 제작',
        '완충 식재대와 생태 탐방로 등 세부 공간 계획'
      ],
      tags: ['Photoshop', '마스터플랜', '팀 프로젝트', '생태 설계'],
      image: 'project-urban-forest.jpg',
      github: null,
      award: null
    },
    6: {
      vol: 'VOL. 06',
      cat: '조경 설계 공모전',
      title: '청도서원(淸道書院)',
      desc: '서울 노들섬을 대상지로, 유상곡수(流觴曲水)·화계(花階) 등 전통 조경 기법을 접목한 정원을 설계한 대한민국 전통조경대전(제2회) 출품작 "청도서원"입니다. 팀 프로젝트로 참여해 마스터플랜 제작을 맡았으며, 장려상을 수상했습니다.',
      features: [
        '유상곡수·화계 등 전통 조경 기법 리서치 및 설계 적용',
        '전통 정자와 연못을 중심으로 한 공간 구성',
        '대상지의 곡선형 부지를 살린 동선 계획',
        '마스터플랜 제작'
      ],
      tags: ['Photoshop', '마스터플랜', '팀 프로젝트', '전통 조경'],
      image: 'project-traditional-garden.jpg',
      github: null,
      award: '장려상 · 대한민국 전통조경대전 제2회',
      links: [
        { label: '출품 영상 보기', url: 'https://youtu.be/WI0e0YNzEpc', icon: 'fa-brands fa-youtube' },
        { label: '공식 수상작 갤러리', url: 'https://khs.spectory.net/klandscape2/klandscape2/plagiary?bno=122&gno=2&page=2', icon: 'fa-solid fa-trophy' }
      ]
    }
  };

  // Filter Logic
  const filterBtns = document.querySelectorAll('.ed-filter-btn');
  const storyCards = document.querySelectorAll('.story-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      storyCards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          card.style.display = 'flex';
          card.style.opacity = '1';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Modal Logic
  const storyModal = document.getElementById('story-modal');
  const modalExitBtn = document.getElementById('modal-exit-btn');
  const modalVol = document.getElementById('modal-vol');
  const modalCat = document.getElementById('modal-cat');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalFeatures = document.getElementById('modal-features');
  const modalTags = document.getElementById('modal-tags');
  const modalGithub = document.getElementById('modal-github');
  const modalFooter = document.getElementById('modal-footer');
  const modalLinks = document.getElementById('modal-links');
  const modalAward = document.getElementById('modal-award');

  function openStoryModal(id) {
    const data = projectStories[id];
    if (!data) return;

    modalVol.textContent = data.vol;
    modalCat.textContent = data.cat;
    modalTitle.textContent = data.title;
    modalDesc.textContent = data.desc;

    modalFeatures.innerHTML = '';
    data.features.forEach(f => {
      const li = document.createElement('li');
      li.textContent = f;
      modalFeatures.appendChild(li);
    });

    modalTags.innerHTML = '';
    data.tags.forEach(t => {
      const span = document.createElement('span');
      span.textContent = t;
      modalTags.appendChild(span);
    });

    // GitHub 저장소가 있는 프로젝트만 링크 버튼을 보여줌 (디자인/공모전 프로젝트는 저장소가 없음)
    if (data.github) {
      modalGithub.href = data.github;
      modalGithub.style.display = '';
    } else {
      modalGithub.style.display = 'none';
    }

    // 참고 링크(출품 영상, 공식 수상작 갤러리 등)가 있는 프로젝트만 버튼으로 표시
    modalLinks.innerHTML = '';
    if (data.links && data.links.length) {
      data.links.forEach(link => {
        const a = document.createElement('a');
        a.href = link.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'santioni-btn btn-outlined';
        a.innerHTML = `<i class="${link.icon}"></i> ${link.label}`;
        modalLinks.appendChild(a);
      });
    }

    const hasGithub = !!data.github;
    const hasLinks = !!(data.links && data.links.length);
    modalFooter.style.display = (hasGithub || hasLinks) ? '' : 'none';

    // 수상 내역이 있는 프로젝트만 배지를 보여줌
    if (data.award) {
      modalAward.textContent = `🏆 ${data.award}`;
      modalAward.style.display = '';
    } else {
      modalAward.style.display = 'none';
    }

    storyModal.classList.add('active');
    storyModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeStoryModal() {
    storyModal.classList.remove('active');
    storyModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.btn-open-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-project');
      openStoryModal(id);
    });
  });

  if (modalExitBtn) {
    modalExitBtn.addEventListener('click', closeStoryModal);
  }

  if (storyModal) {
    storyModal.addEventListener('click', (e) => {
      if (e.target === storyModal) {
        closeStoryModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && storyModal && storyModal.classList.contains('active')) {
      closeStoryModal();
    }
  });

  // ==========================================================================
  // 8. Email Clipboard Copy & Form Dispatch
  // ==========================================================================
  const copyEmailBtn = document.getElementById('copy-email-btn');
  if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', () => {
      const email = copyEmailBtn.getAttribute('data-email') || 'sin53118153@gmail.com';
      navigator.clipboard.writeText(email).then(() => {
        showToast('COPIED: sin53118153@gmail.com');
      }).catch(() => {
        showToast('FAILED TO COPY EMAIL');
      });
    });
  }

  const editorialForm = document.getElementById('editorial-form');
  if (editorialForm) {
    editorialForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('c-name').value;
      const email = document.getElementById('c-email').value;
      const message = document.getElementById('c-message').value;
      const submitBtn = document.getElementById('btn-form-submit');

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>DISPATCHING...</span>';

      const delivered = await sendContactMessage({ name, email, message });

      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>SEND TRANSMISSION</span> <i class="fa-solid fa-paper-plane"></i>';
      showToast(
        delivered
          ? `TRANSMISSION RECEIVED FROM ${name.toUpperCase()}`
          : `TRANSMISSION QUEUED (OFFLINE) — ${name.toUpperCase()}`
      );
      editorialForm.reset();
    });
  }

  // 백엔드(backend/)로 실제 메시지 전송을 시도한다.
  // 백엔드가 꺼져 있거나, 아직 배포되지 않았거나, 응답이 없으면(타임아웃 2.5초)
  // 조용히 실패 처리하고 false를 반환한다 — 폼 자체는 항상 성공한 것처럼 보여주므로
  // 백엔드 유무와 무관하게 방문자 경험은 그대로 유지된다.
  async function sendContactMessage(payload) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const res = await fetch(`${API_BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      return res.ok;
    } catch (err) {
      // 백엔드 미실행/네트워크 오류 등 — 조용히 폴백
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ==========================================================================
  // 9. Toast Notification Shelf
  // ==========================================================================
  function showToast(msg) {
    const shelf = document.getElementById('toast-shelf');
    if (!shelf) return;

    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.textContent = `[ SYSTEM ] ${msg}`;
    shelf.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('reveal');
    }, 20);

    setTimeout(() => {
      toast.classList.remove('reveal');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3200);
  }

  // ==========================================================================
  // 10. Share Menu (Link 공유 / PDF로 저장)
  // ==========================================================================
  const shareMenuWrapper = document.getElementById('share-menu-wrapper');
  const shareBtn = document.getElementById('share-btn');
  const shareDropdown = document.getElementById('share-dropdown');
  const shareLinkBtn = document.getElementById('share-link-btn');
  const sharePdfBtn = document.getElementById('share-pdf-btn');

  function closeShareDropdown() {
    if (!shareDropdown) return;
    shareDropdown.classList.remove('open');
    shareDropdown.setAttribute('aria-hidden', 'true');
    if (shareBtn) shareBtn.setAttribute('aria-expanded', 'false');
  }

  if (shareBtn && shareDropdown) {
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = shareDropdown.classList.toggle('open');
      shareDropdown.setAttribute('aria-hidden', String(!isOpen));
      shareBtn.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (e) => {
      if (shareMenuWrapper && !shareMenuWrapper.contains(e.target)) {
        closeShareDropdown();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeShareDropdown();
    });
  }

  if (shareLinkBtn) {
    shareLinkBtn.addEventListener('click', async () => {
      closeShareDropdown();
      const url = window.location.href;

      if (navigator.share) {
        try {
          await navigator.share({ title: document.title, url });
          return;
        } catch (err) {
          // 사용자가 공유를 취소한 경우 등은 별도 처리 없이 무시
          return;
        }
      }

      try {
        await navigator.clipboard.writeText(url);
        showToast('링크가 클립보드에 복사되었습니다');
      } catch (err) {
        showToast('링크 복사에 실패했습니다');
      }
    });
  }

  if (sharePdfBtn) {
    sharePdfBtn.addEventListener('click', () => {
      closeShareDropdown();
      buildPdfExportDocument();
      window.print();
    });
  }

  // 화면에 보이는 실제 콘텐츠(About/Skills/Timeline/Contact)와 projectStories 데이터를
  // 그대로 읽어와 인쇄 전용 구조화 문서를 새로 조립한다.
  // -> 콘텐츠를 두 곳에 중복 작성하지 않고, 화면 내용이 바뀌면 PDF에도 그대로 반영된다.
  function buildPdfExportDocument() {
    const doc = document.getElementById('pdf-export-doc');
    if (!doc) return;

    const esc = (s) => String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

    const name = text(document.querySelector('.title-line'));
    const role = text(document.querySelector('.title-subline'));
    const statement = text(document.querySelector('.statement-heading'));
    const paragraph = text(document.querySelector('.statement-paragraph'));
    const email = document.getElementById('copy-email-btn')?.getAttribute('data-email') || '';

    const directItems = document.querySelectorAll('.contact-direct-panel .direct-item');
    let affiliation = '', address = '';
    if (directItems[1]) {
      affiliation = text(directItems[1].querySelector('.direct-val'));
      address = text(directItems[1].querySelector('.direct-sub'));
    }
    const socialLinks = Array.from(document.querySelectorAll('.ed-social-btn')).map(a => ({
      label: text(a),
      href: a.getAttribute('href') || ''
    }));

    const aboutItems = Array.from(document.querySelectorAll('.about-item-panel')).map(panel => ({
      heading: text(panel.querySelector('.panel-heading')),
      sub: text(panel.querySelector('.panel-korean-sub')),
      body: text(panel.querySelector('.panel-text'))
    }));

    const skillCols = Array.from(document.querySelectorAll('.skill-col-panel')).map(col => ({
      title: text(col.querySelector('.matrix-title')),
      items: Array.from(col.querySelectorAll('.matrix-item')).map(li => ({
        name: text(li.querySelector('.m-name')),
        val: text(li.querySelector('.m-val'))
      }))
    }));

    const timelineItems = Array.from(document.querySelectorAll('.timeline-row')).map(row => ({
      year: text(row.querySelector('.t-year')),
      title: text(row.querySelector('.t-title')),
      role: text(row.querySelector('.t-role')),
      desc: text(row.querySelector('.t-desc'))
    }));

    let html = '';

    html += `<header class="pdf-header">
      <h1>${esc(name)}</h1>
      <p class="pdf-role">${esc(role)}</p>
      <p class="pdf-contact">${[esc(email), esc(affiliation)].filter(Boolean).join(' · ')}</p>
      ${address ? `<p class="pdf-contact-sub">${esc(address)}</p>` : ''}
    </header>`;

    html += `<section class="pdf-section">
      <h2>소개</h2>
      <p class="pdf-statement">${esc(statement)}</p>
      <p>${esc(paragraph)}</p>
    </section>`;

    if (aboutItems.length) {
      html += `<section class="pdf-section"><h2>작업 원칙</h2><div class="pdf-about-grid">`;
      aboutItems.forEach(item => {
        html += `<div class="pdf-about-item">
          <h3>${esc(item.heading)}</h3>
          <h4>${esc(item.sub)}</h4>
          <p>${esc(item.body)}</p>
        </div>`;
      });
      html += `</div></section>`;
    }

    if (skillCols.length) {
      html += `<section class="pdf-section"><h2>기술 스택</h2><div class="pdf-skills-grid">`;
      skillCols.forEach(col => {
        html += `<div class="pdf-skill-col"><h3>${esc(col.title)}</h3><ul>`;
        col.items.forEach(it => {
          html += `<li><span>${esc(it.name)}</span><span class="pdf-skill-val">${esc(it.val)}</span></li>`;
        });
        html += `</ul></div>`;
      });
      html += `</div></section>`;
    }

    const projectIds = Object.keys(projectStories);
    if (projectIds.length) {
      html += `<section class="pdf-section"><h2>프로젝트</h2>`;
      projectIds.forEach(id => {
        const p = projectStories[id];
        html += `<div class="pdf-project">
          <div class="pdf-project-head">
            <span class="pdf-project-vol">${esc(p.vol)}</span>
            <span class="pdf-project-cat">${esc(p.cat)}</span>
            ${p.award ? `<span class="pdf-project-award">🏆 ${esc(p.award)}</span>` : ''}
          </div>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.desc)}</p>
          <ul class="pdf-project-features">
            ${p.features.map(f => `<li>${esc(f)}</li>`).join('')}
          </ul>
          <div class="pdf-project-tags">${p.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>
          ${(p.github || (p.links && p.links.length)) ? `<div class="pdf-project-links">
            ${p.github ? `<span>GitHub: ${esc(p.github)}</span>` : ''}
            ${(p.links || []).map(l => `<span>${esc(l.label)}: ${esc(l.url)}</span>`).join('')}
          </div>` : ''}
        </div>`;
      });
      html += `</section>`;
    }

    if (timelineItems.length) {
      html += `<section class="pdf-section"><h2>타임라인</h2>`;
      timelineItems.forEach(t => {
        html += `<div class="pdf-timeline-item">
          <span class="pdf-timeline-year">${esc(t.year)}</span>
          <div>
            <h3>${esc(t.title)}</h3>
            <h4>${esc(t.role)}</h4>
            <p>${esc(t.desc)}</p>
          </div>
        </div>`;
      });
      html += `</section>`;
    }

    if (socialLinks.length) {
      html += `<section class="pdf-section"><h2>연락처 &amp; 링크</h2><ul class="pdf-social-list">`;
      socialLinks.forEach(s => {
        html += `<li>${esc(s.label)}: ${esc(s.href)}</li>`;
      });
      html += `</ul></section>`;
    }

    doc.innerHTML = html;
  }
});
