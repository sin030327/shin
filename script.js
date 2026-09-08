/**
 * SHIN JAEHOON // THE SANTIONI SPIRITS PORTFOLIO SCRIPT
 * Web Audio, Interactive 3D Tilt, Custom Cursor & Gate Logic
 */

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

    modalGithub.href = data.github;

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
    editorialForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('c-name').value;
      const submitBtn = document.getElementById('btn-form-submit');

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>DISPATCHING...</span>';

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>SEND TRANSMISSION</span> <i class="fa-solid fa-paper-plane"></i>';
        showToast(`TRANSMISSION RECEIVED FROM ${name.toUpperCase()}`);
        editorialForm.reset();
      }, 1000);
    });
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
});
