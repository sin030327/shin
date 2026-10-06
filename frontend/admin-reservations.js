/**
 * 관리자 페이지 — 방문 예약 관리.
 * admin.js와 같은 방식으로 동작한다: 인증은 백엔드가 httpOnly 쿠키로 처리하고,
 * 이 파일은 로그인 여부만 확인한 뒤 목록을 불러와 표로 그린다.
 */

const API_BASE_URL = 'http://localhost:4000';

// 처리 상태 4단계 (백엔드 db/index.js의 RESERVATION_STATUSES와 키를 맞춘다).
const STATUS_OPTIONS = [
  { key: 'received', label: '접수' },
  { key: 'confirmed', label: '확정' },
  { key: 'change_requested', label: '변경 요청' },
  { key: 'cancelled', label: '취소' }
];

document.addEventListener('DOMContentLoaded', () => {
  const authRequiredView = document.getElementById('admin-auth-required');
  const reservationView = document.getElementById('admin-reservation-view');
  const tbody = document.getElementById('admin-res-tbody');
  const emptyMsg = document.getElementById('admin-res-empty');
  const countEl = document.getElementById('admin-res-count');
  const refreshBtn = document.getElementById('admin-refresh-btn');
  const logoutBtn = document.getElementById('admin-logout-btn');
  const toastEl = document.getElementById('admin-toast');

  let cachedReservations = [];
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
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // admin.js와 동일한 공통 호출 헬퍼. 쿠키(credentials: 'include')를 항상 함께 보낸다.
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
      // 응답 본문이 없는 경우
    }

    if (!res.ok) {
      const message = (body && body.error) || `요청에 실패했습니다. (HTTP ${res.status})`;
      const error = new Error(message);
      error.status = res.status;
      throw error;
    }
    return body;
  }

  /**
   * 백엔드가 꺼져 있어서 생긴 네트워크 오류인지 구분한다.
   * (이 경우 err.status가 없다 — 서버 응답 자체를 받지 못했기 때문)
   * "로그인이 필요합니다"로 잘못 안내하지 않기 위해 따로 처리한다.
   */
  function isNetworkError(err) {
    return !err || err.status === undefined;
  }

  function describeError(err) {
    if (isNetworkError(err)) {
      return '백엔드 서버에 연결할 수 없습니다. backend 폴더에서 "npm start"로 서버를 실행했는지 확인해 주세요.';
    }
    return err.message;
  }

  // -----------------------------------------------------------------------
  // 표시용 포맷
  // -----------------------------------------------------------------------
  const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

  /** '2026-10-15' + '15:00' -> '2026년 10월 15일 (목) 15:00' */
  function formatVisitDateTime(dateISO, time) {
    if (!dateISO) return escapeHtml(time || '-');
    const [y, m, d] = String(dateISO).split('-').map(Number);
    if (!y || !m || !d) return `${escapeHtml(dateISO)} ${escapeHtml(time || '')}`.trim();
    const weekday = WEEKDAY_LABELS[new Date(y, m - 1, d).getDay()];
    return `${y}년 ${m}월 ${d}일 (${weekday}) ${time || ''}`.trim();
  }

  // -----------------------------------------------------------------------
  // 목록 불러오기 / 그리기
  // -----------------------------------------------------------------------
  async function loadReservations() {
    try {
      cachedReservations = await api('/api/admin/reservations');
      renderTable();
    } catch (err) {
      if (err.status === 401) {
        showAuthRequired();
        return;
      }
      tbody.innerHTML = '';
      countEl.textContent = '';
      emptyMsg.hidden = false;
      emptyMsg.textContent = `예약 목록을 불러오지 못했습니다. ${describeError(err)}`;
    }
  }

  function renderTable() {
    tbody.innerHTML = '';

    if (!cachedReservations.length) {
      emptyMsg.hidden = false;
      emptyMsg.textContent = '아직 접수된 예약 요청이 없습니다.';
      countEl.textContent = '';
      return;
    }

    emptyMsg.hidden = true;
    countEl.textContent = `총 ${cachedReservations.length}건`;

    cachedReservations.forEach((r) => {
      const tr = document.createElement('tr');
      tr.className = `admin-res-row admin-res-row--${r.status}`;
      tr.innerHTML = `
        <td class="admin-res-no">${escapeHtml(r.reservationNo)}</td>
        <td>
          <div class="admin-res-name">${escapeHtml(r.name)}</div>
          <a class="admin-res-email" href="mailto:${escapeHtml(r.email)}">${escapeHtml(r.email)}</a>
        </td>
        <td class="admin-res-when">${escapeHtml(formatVisitDateTime(r.date, r.time))}</td>
        <td>
          <div class="admin-res-purpose" title="${escapeHtml(r.purpose)}">${escapeHtml(r.purpose)}</div>
        </td>
        <td>
          <span class="admin-res-status admin-res-status--${r.status}">${escapeHtml(r.statusLabel)}</span>
        </td>
        <td>
          <div class="admin-res-actions">
            ${STATUS_OPTIONS.map((opt) => `
              <button type="button"
                class="admin-res-action-btn${r.status === opt.key ? ' active' : ''}"
                data-id="${escapeHtml(r.id)}"
                data-status="${opt.key}"
                ${r.status === opt.key ? 'disabled' : ''}>${opt.label}</button>
            `).join('')}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // 표를 매번 새로 그리기 때문에 이벤트도 그때그때 다시 건다 (이전 리스너는 DOM과 함께 사라짐)
    tbody.querySelectorAll('.admin-res-action-btn').forEach((btn) => {
      btn.addEventListener('click', () => changeStatus(btn.dataset.id, btn.dataset.status));
    });
  }

  // -----------------------------------------------------------------------
  // 처리 상태 변경
  // -----------------------------------------------------------------------
  async function changeStatus(id, status) {
    const label = STATUS_OPTIONS.find((o) => o.key === status)?.label || status;

    try {
      await api(`/api/admin/reservations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      showToast(`'${label}' 상태로 변경되었습니다.`);
      await loadReservations();
    } catch (err) {
      if (err.status === 401) {
        showAuthRequired();
        return;
      }
      showToast(describeError(err));
    }
  }

  // -----------------------------------------------------------------------
  // 화면 전환
  // -----------------------------------------------------------------------
  function showAuthRequired() {
    authRequiredView.hidden = false;
    reservationView.hidden = true;
  }

  async function showReservationView() {
    authRequiredView.hidden = true;
    reservationView.hidden = false;
    await loadReservations();
  }

  refreshBtn.addEventListener('click', loadReservations);

  logoutBtn.addEventListener('click', async () => {
    try {
      await api('/api/admin/logout', { method: 'POST' });
    } catch (err) {
      // 로그아웃 요청이 실패해도 로그인 화면으로 되돌린다.
    }
    window.location.href = 'admin.html';
  });

  // -----------------------------------------------------------------------
  // 시작 — 로그인 상태면 탭을 누른 즉시 표가 바로 보이도록 목록까지 불러온다.
  // -----------------------------------------------------------------------
  (async function init() {
    try {
      await api('/api/admin/session');
      await showReservationView();
    } catch (err) {
      // 로그인이 안 된 경우(401)에만 로그인 안내를 띄운다.
      // 백엔드가 꺼져 있는 경우에는 표 영역에 그 사실을 그대로 알려준다.
      if (isNetworkError(err)) {
        await showReservationView();
      } else {
        showAuthRequired();
      }
    }
  })();
});
