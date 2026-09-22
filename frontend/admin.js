/**
 * 관리자 페이지 로직 (로그인, 프로젝트 목록/등록/수정/삭제).
 * 인증은 전부 백엔드가 httpOnly 쿠키로 처리한다 — 이 파일은 비밀번호를
 * 서버에 전달만 할 뿐, 어떤 형태로든 저장하거나 다시 사용하지 않는다.
 */

const API_BASE_URL = 'http://localhost:4000';

document.addEventListener('DOMContentLoaded', () => {
  const loginView = document.getElementById('admin-login-view');
  const dashboardView = document.getElementById('admin-dashboard-view');
  const loginForm = document.getElementById('admin-login-form');
  const loginError = document.getElementById('admin-login-error');
  const passwordInput = document.getElementById('admin-password');
  const logoutBtn = document.getElementById('admin-logout-btn');

  const listEl = document.getElementById('admin-project-list');
  const emptyMsg = document.getElementById('admin-empty-msg');
  const formTitleEl = document.getElementById('admin-form-title');
  const form = document.getElementById('admin-project-form');
  const formError = document.getElementById('admin-form-error');
  const newBtn = document.getElementById('admin-new-btn');
  const deleteBtn = document.getElementById('admin-delete-btn');
  const toastEl = document.getElementById('admin-toast');
  const duplicateBanner = document.getElementById('admin-duplicate-banner');

  const fTitle = document.getElementById('f-title');
  const fRole = document.getElementById('f-role');
  const fDescription = document.getElementById('f-description');
  const fDate = document.getElementById('f-date');
  const fTeamSize = document.getElementById('f-team-size');
  const fNotes = document.getElementById('f-notes');

  let currentEditingId = null;
  let cachedProjects = [];
  let toastTimer = null;

  function showToast(msg) {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.hidden = false;
    requestAnimationFrame(() => toastEl.classList.add('show'));
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
      setTimeout(() => { toastEl.hidden = true; }, 250);
    }, 2600);
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // 백엔드 API 공통 호출 헬퍼. 쿠키(credentials: 'include')를 항상 함께 보낸다.
  async function api(path, options = {}) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options
    });

    let body = null;
    try {
      body = await res.json();
    } catch (err) {
      // 응답 본문이 없는 경우 (예: 204)
    }

    if (!res.ok) {
      const message = (body && body.error) || `요청에 실패했습니다. (HTTP ${res.status})`;
      throw new Error(message);
    }
    return body;
  }

  async function checkSession() {
    try {
      await api('/api/admin/session');
      return true;
    } catch (err) {
      return false;
    }
  }

  function showLoginView() {
    loginView.hidden = false;
    dashboardView.hidden = true;
  }

  async function showDashboardView() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    await loadProjects();
    resetForm();
  }

  // -----------------------------------------------------------------------
  // 로그인 / 로그아웃
  // -----------------------------------------------------------------------
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;

    try {
      await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password: passwordInput.value })
      });
      passwordInput.value = '';
      await showDashboardView();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.hidden = false;
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await api('/api/admin/logout', { method: 'POST' });
    } catch (err) {
      // 로그아웃 요청이 실패해도 화면은 로그인 화면으로 되돌린다.
    }
    showLoginView();
  });

  // -----------------------------------------------------------------------
  // 프로젝트 목록
  // -----------------------------------------------------------------------
  async function loadProjects() {
    try {
      cachedProjects = await api('/api/admin/projects');
      renderList();
    } catch (err) {
      showToast(err.message);
    }
  }

  function renderList() {
    listEl.innerHTML = '';
    emptyMsg.hidden = cachedProjects.length > 0;

    cachedProjects.forEach((p) => {
      const li = document.createElement('li');
      li.className = 'admin-project-row' + (p.id === currentEditingId ? ' active' : '');
      li.innerHTML = `
        <div class="admin-project-row-main">
          <span class="admin-status-badge ${p.status === 'published' ? 'published' : 'draft'}">
            ${p.status === 'published' ? '공개' : '초안'}
          </span>
          <span class="admin-project-row-title">${escapeHtml(p.title) || '(제목 없음)'}</span>
        </div>
        <span class="admin-project-row-date">${escapeHtml(p.date)}</span>
      `;
      li.addEventListener('click', () => loadIntoForm(p));
      listEl.appendChild(li);
    });

    renderDuplicateWarning();
  }

  // -----------------------------------------------------------------------
  // 중복 프로젝트 확인
  // 제목을 소문자/공백/특수문자 제거로 다듬어서 똑같거나 한쪽이 다른 쪽을
  // 포함하면 "중복일 수 있음"으로 묶는다. 정교한 유사도 계산 없이 문자열
  // 비교만으로 판단하기 때문에 로직이 간단하다 — 완벽하진 않아도 충분하다.
  // -----------------------------------------------------------------------
  function normalizeTitle(title) {
    return String(title || '')
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^\p{L}\p{N}]/gu, '');
  }

  function findDuplicateGroups(projects) {
    const groups = [];
    const used = new Set();

    for (let i = 0; i < projects.length; i++) {
      if (used.has(projects[i].id)) continue;
      const a = normalizeTitle(projects[i].title);
      if (!a) continue;

      const group = [projects[i]];
      for (let j = i + 1; j < projects.length; j++) {
        if (used.has(projects[j].id)) continue;
        const b = normalizeTitle(projects[j].title);
        if (!b) continue;

        const isSameTitle = a === b;
        const oneContainsOther = (a.includes(b) || b.includes(a)) && Math.min(a.length, b.length) >= 4;

        if (isSameTitle || oneContainsOther) {
          group.push(projects[j]);
          used.add(projects[j].id);
        }
      }

      if (group.length > 1) {
        used.add(projects[i].id);
        groups.push(group);
      }
    }

    return groups;
  }

  function renderDuplicateWarning() {
    const groups = findDuplicateGroups(cachedProjects);

    if (!groups.length) {
      duplicateBanner.hidden = true;
      duplicateBanner.innerHTML = '';
      return;
    }

    duplicateBanner.hidden = false;
    duplicateBanner.innerHTML = `<h3><i class="fa-solid fa-triangle-exclamation"></i> 제목이 비슷한 프로젝트가 ${groups.length}건 있습니다. 하나를 열어서 확인하거나 중복분을 삭제하세요.</h3>`;

    groups.forEach((group) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'admin-dup-group';
      groupEl.innerHTML = group.map((p) => `
        <div class="admin-dup-item">
          <span class="admin-status-badge ${p.status === 'published' ? 'published' : 'draft'}">${p.status === 'published' ? '공개' : '초안'}</span>
          <span class="admin-dup-title">${escapeHtml(p.title) || '(제목 없음)'}</span>
          <button type="button" class="admin-btn admin-btn-sm admin-btn-ghost" data-open="${p.id}">열어서 확인</button>
          <button type="button" class="admin-btn admin-btn-sm admin-btn-ghost" data-delete="${p.id}">이것 삭제</button>
        </div>
      `).join('');
      duplicateBanner.appendChild(groupEl);
    });

    // 매번 새로 그리기 때문에 이벤트도 그때그때 다시 걸어준다 (이전 리스너는 DOM과 함께 사라짐)
    duplicateBanner.querySelectorAll('[data-open]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = cachedProjects.find((x) => x.id === btn.dataset.open);
        if (p) loadIntoForm(p);
      });
    });

    duplicateBanner.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('이 프로젝트를 삭제할까요? 되돌릴 수 없습니다.')) return;
        try {
          await api(`/api/admin/projects/${btn.dataset.delete}`, { method: 'DELETE' });
          showToast('삭제되었습니다.');
          if (currentEditingId === btn.dataset.delete) resetForm();
          await loadProjects();
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  }

  // -----------------------------------------------------------------------
  // 등록/수정 폼
  // -----------------------------------------------------------------------
  function resetForm() {
    currentEditingId = null;
    formTitleEl.textContent = '새 프로젝트';
    form.reset();
    document.querySelector('input[name="status"][value="draft"]').checked = true;
    deleteBtn.hidden = true;
    formError.hidden = true;
    renderList();
  }

  function loadIntoForm(p) {
    currentEditingId = p.id;
    formTitleEl.textContent = '프로젝트 수정';
    fTitle.value = p.title || '';
    fRole.value = p.role || '';
    fDescription.value = p.description || '';
    fDate.value = p.date || '';
    fTeamSize.value = p.teamSize || '';
    fNotes.value = p.notes || '';
    document.querySelector(`input[name="status"][value="${p.status === 'published' ? 'published' : 'draft'}"]`).checked = true;
    deleteBtn.hidden = false;
    formError.hidden = true;
    renderList();
  }

  newBtn.addEventListener('click', resetForm);

  function collectFormData() {
    const statusInput = document.querySelector('input[name="status"]:checked');
    return {
      title: fTitle.value.trim(),
      role: fRole.value.trim(),
      description: fDescription.value.trim(),
      date: fDate.value.trim(),
      teamSize: fTeamSize.value.trim(),
      notes: fNotes.value.trim(),
      status: statusInput ? statusInput.value : 'draft'
    };
  }

  // 서버와 동일한 규칙(공개 상태면 참고사항 제외 전부 필수)을 미리 확인해서
  // 왕복 없이 바로 피드백을 준다. 최종 판단은 항상 서버가 다시 한다.
  function validateBeforeSubmit(data) {
    if (data.status !== 'published') return null;

    const required = [
      ['title', '제목'],
      ['role', '내가 한 역할'],
      ['description', '설명'],
      ['date', '날짜'],
      ['teamSize', '참여인원 수']
    ];

    for (const [key, label] of required) {
      if (!data[key]) {
        return `공개하려면 '${label}' 항목을 입력해야 합니다.`;
      }
    }
    return null;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.hidden = true;

    const data = collectFormData();
    const clientError = validateBeforeSubmit(data);
    if (clientError) {
      formError.textContent = clientError;
      formError.hidden = false;
      return;
    }

    try {
      if (currentEditingId) {
        await api(`/api/admin/projects/${currentEditingId}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        showToast('수정되었습니다.');
      } else {
        const created = await api('/api/admin/projects', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        currentEditingId = created.id;
        showToast('저장되었습니다.');
      }

      await loadProjects();
      const saved = cachedProjects.find((p) => p.id === currentEditingId);
      if (saved) loadIntoForm(saved);
    } catch (err) {
      formError.textContent = err.message;
      formError.hidden = false;
    }
  });

  deleteBtn.addEventListener('click', async () => {
    if (!currentEditingId) return;
    if (!confirm('이 프로젝트를 삭제할까요? 되돌릴 수 없습니다.')) return;

    try {
      await api(`/api/admin/projects/${currentEditingId}`, { method: 'DELETE' });
      showToast('삭제되었습니다.');
      resetForm();
      await loadProjects();
    } catch (err) {
      showToast(err.message);
    }
  });

  // -----------------------------------------------------------------------
  // 시작
  // -----------------------------------------------------------------------
  (async function init() {
    const authed = await checkSession();
    if (authed) {
      await showDashboardView();
    } else {
      showLoginView();
    }
  })();
});
