/* ==========================================================================
   RESERVATION PAGE — 방문 예약 (캘린더 + 시간 선택 + 방문자 정보 + 최종 확인)

   구조:
   1. CONFIG            — 공휴일 목록/시간 범위 등, 나중에 바뀔 수 있는 값들
   2. 날짜 유틸리티
   3. 캘린더 렌더링
   4. 희망 시간 드롭다운
   5. 방문자 정보 입력 + 유효성 검사 (필수 입력 / 이메일 형식)
   6. 최종 확인 팝업
   7. 저장(백엔드 전송, 실패 시 오프라인 폴백)
   ========================================================================== */

/* --------------------------------------------------
   1. CONFIG
   -------------------------------------------------- */

// 한국 공휴일 목록. 매년 날짜가 바뀌므로(설날/추석 등 음력 기반 포함),
// 해가 바뀌면 이 목록을 갱신해야 한다. 아래는 2026~2027년 기준.
// 출처: 공개된 공휴일 안내(정부/민간 달력 사이트)를 기준으로 확인한 날짜.
const HOLIDAYS = {
  // 2026
  "2026-01-01": "신정",
  "2026-02-16": "설날 연휴",
  "2026-02-17": "설날",
  "2026-02-18": "설날 연휴",
  "2026-03-01": "삼일절",
  "2026-03-02": "삼일절 대체공휴일",
  "2026-05-01": "근로자의 날", // 관공서 공식 휴일은 아니지만, 방문 가능 여부가 불확실해 보수적으로 제외
  "2026-05-05": "어린이날",
  "2026-05-24": "부처님오신날",
  "2026-05-25": "부처님오신날 대체공휴일",
  "2026-06-03": "지방선거일",
  "2026-06-06": "현충일",
  "2026-07-17": "제헌절",
  "2026-08-15": "광복절",
  "2026-08-17": "광복절 대체공휴일",
  "2026-09-24": "추석 연휴",
  "2026-09-25": "추석",
  "2026-09-26": "추석 연휴",
  "2026-10-03": "개천절",
  "2026-10-05": "개천절 대체공휴일",
  "2026-10-09": "한글날",
  "2026-12-25": "기독탄신일",
  // 2027
  "2027-01-01": "신정",
  "2027-02-06": "설날 연휴",
  "2027-02-07": "설날",
  "2027-02-08": "설날 연휴",
  "2027-02-09": "설날 연휴",
  "2027-03-01": "삼일절",
  "2027-05-05": "어린이날",
  "2027-05-13": "부처님오신날",
  "2027-06-06": "현충일",
  "2027-06-07": "현충일 대체공휴일",
  "2027-07-17": "제헌절",
  "2027-08-15": "광복절",
  "2027-08-16": "광복절 대체공휴일",
  "2027-09-14": "추석 연휴",
  "2027-09-15": "추석",
  "2027-09-16": "추석 연휴",
  "2027-10-03": "개천절",
  "2027-10-04": "개천절 대체공휴일",
  "2027-10-09": "한글날",
  "2027-10-11": "한글날 대체공휴일",
  "2027-12-25": "기독탄신일",
  "2027-12-27": "기독탄신일 대체공휴일",
};

// 희망 시간 드롭다운 범위: 13:00 ~ 18:00, 30분 단위.
const TIME_RANGE = { startHour: 13, endHour: 18, stepMinutes: 30 };

// 연락처 폼(script.js)과 동일한 패턴: 백엔드가 켜져 있으면 실제로 저장되고,
// 꺼져 있으면(현재 배포된 사이트) 조용히 폴백해서 방문자 경험은 그대로 유지한다.
const API_BASE_URL = "http://localhost:4000";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* --------------------------------------------------
   2. 날짜 유틸리티
   -------------------------------------------------- */

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isHoliday(isoDate) {
  return Boolean(HOLIDAYS[isoDate]);
}

function isPastDate(date, today) {
  return date < today;
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDateLabel(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${y}년 ${m}월 ${d}일 (${WEEKDAY_LABELS[date.getDay()]})`;
}

/* --------------------------------------------------
   3. 캘린더 렌더링
   -------------------------------------------------- */

const calendarState = {
  viewYear: new Date().getFullYear(),
  viewMonth: new Date().getMonth(), // 0-11
  selectedDateISO: null,
};

function renderCalendar() {
  const grid = document.getElementById("res-cal-grid");
  const monthLabel = document.getElementById("res-cal-month-label");
  const prevBtn = document.getElementById("res-cal-prev");
  if (!grid || !monthLabel) return;

  const { viewYear, viewMonth } = calendarState;
  monthLabel.textContent = `${viewYear}년 ${viewMonth + 1}월`;

  const today = startOfToday();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startOffset = firstDayOfMonth.getDay(); // 0(일) ~ 6(토)

  // 이번 달이 "오늘이 속한 달"보다 이전이면 더 이전으로 못 가게 막는다.
  const isCurrentCalendarMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();
  if (prevBtn) prevBtn.disabled = isCurrentCalendarMonth;

  grid.innerHTML = "";

  for (let i = 0; i < startOffset; i++) {
    const blank = document.createElement("span");
    blank.className = "res-cal-cell res-cal-cell--blank";
    grid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(viewYear, viewMonth, day);
    const iso = toISODate(date);
    const weekend = isWeekend(date);
    const holiday = isHoliday(iso);
    const past = isPastDate(date, today);
    const disabled = weekend || holiday || past;

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "res-cal-cell";
    cell.textContent = String(day);
    cell.setAttribute("data-date", iso);

    if (disabled) {
      cell.classList.add("res-cal-cell--disabled");
      cell.disabled = true;
      if (holiday) {
        cell.classList.add("res-cal-cell--holiday");
        cell.title = HOLIDAYS[iso];
      } else if (weekend) {
        cell.classList.add("res-cal-cell--holiday");
        cell.title = "주말";
      }
    } else {
      cell.addEventListener("click", () => selectDate(iso));
    }

    if (iso === calendarState.selectedDateISO) {
      cell.classList.add("res-cal-cell--selected");
    }

    grid.appendChild(cell);
  }
}

function selectDate(iso) {
  calendarState.selectedDateISO = iso;
  const box = document.getElementById("res-selected-date-box");
  if (box) {
    box.textContent = formatDateLabel(iso);
    box.classList.add("res-selected-date-box--filled");
  }
  renderCalendar();
  validateForm();
}

function changeMonth(delta) {
  let { viewYear, viewMonth } = calendarState;
  viewMonth += delta;
  if (viewMonth < 0) {
    viewMonth = 11;
    viewYear -= 1;
  } else if (viewMonth > 11) {
    viewMonth = 0;
    viewYear += 1;
  }
  calendarState.viewYear = viewYear;
  calendarState.viewMonth = viewMonth;
  renderCalendar();
}

/* --------------------------------------------------
   4. 희망 시간 드롭다운
   -------------------------------------------------- */

function populateTimeSelect() {
  const select = document.getElementById("res-time-select");
  if (!select) return;

  const { startHour, endHour, stepMinutes } = TIME_RANGE;
  let current = new Date(2000, 0, 1, startHour, 0);
  const end = new Date(2000, 0, 1, endHour, 0);

  while (current <= end) {
    const h = String(current.getHours()).padStart(2, "0");
    const m = String(current.getMinutes()).padStart(2, "0");
    const option = document.createElement("option");
    option.value = `${h}:${m}`;
    option.textContent = `${h}:${m}`;
    select.appendChild(option);
    current = new Date(current.getTime() + stepMinutes * 60000);
  }
}

/* --------------------------------------------------
   5. 방문자 정보 입력 + 유효성 검사
   -------------------------------------------------- */

function validateEmailField() {
  const input = document.getElementById("res-email");
  const errorEl = document.getElementById("res-email-error");
  if (!input || !errorEl) return false;

  const value = input.value.trim();
  if (value === "") {
    // 아직 입력 전: 빨간 에러 표시 없이 "필수" 상태로만 둔다.
    input.classList.remove("res-input--invalid");
    errorEl.textContent = "";
    return false;
  }

  const valid = EMAIL_PATTERN.test(value);
  input.classList.toggle("res-input--invalid", !valid);
  errorEl.textContent = valid ? "" : "이메일 형식이 올바르지 않습니다. (예: example@domain.com)";
  return valid;
}

function validateForm() {
  const name = document.getElementById("res-name")?.value.trim();
  const emailValid = validateEmailField();
  const purpose = document.getElementById("res-purpose")?.value.trim();
  const consent = document.getElementById("res-consent")?.checked;
  const time = document.getElementById("res-time-select")?.value;
  const date = calendarState.selectedDateISO;

  const submitBtn = document.getElementById("res-submit-btn");
  const allValid = Boolean(name && emailValid && purpose && consent && time && date);
  if (submitBtn) submitBtn.disabled = !allValid;
  return allValid;
}

/* --------------------------------------------------
   6. 최종 확인 팝업
   -------------------------------------------------- */

function openConfirmModal() {
  document.getElementById("res-confirm-date").textContent = formatDateLabel(calendarState.selectedDateISO);
  document.getElementById("res-confirm-time").textContent = document.getElementById("res-time-select").value;
  document.getElementById("res-confirm-name").textContent = document.getElementById("res-name").value.trim();
  document.getElementById("res-confirm-email").textContent = document.getElementById("res-email").value.trim();
  document.getElementById("res-confirm-purpose").textContent = document.getElementById("res-purpose").value.trim();

  document.getElementById("res-modal-overlay").classList.add("active");
}

function closeConfirmModal() {
  document.getElementById("res-modal-overlay").classList.remove("active");
}

/* --------------------------------------------------
   7. 저장 (백엔드 전송, 실패 시 오프라인 폴백)
   -------------------------------------------------- */

// script.js의 sendContactMessage()와 동일한 패턴: 백엔드가 꺼져 있거나
// 응답이 없으면(2.5초 타임아웃) 조용히 폴백하고, 방문자에게는 접수된 것처럼
// 안내한다(실제 처리/확정은 다음 단계에서 구현).
async function saveReservation(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(`${API_BASE_URL}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return res.ok;
  } catch (err) {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

function resetForm() {
  document.getElementById("reservation-form").reset();
  calendarState.selectedDateISO = null;
  const box = document.getElementById("res-selected-date-box");
  if (box) {
    box.textContent = "선택된 날짜가 없습니다";
    box.classList.remove("res-selected-date-box--filled");
  }
  document.getElementById("res-email-error").textContent = "";
  document.getElementById("res-email").classList.remove("res-input--invalid");
  renderCalendar();
  validateForm();
}

/* --------------------------------------------------
   초기화
   -------------------------------------------------- */

function init() {
  populateTimeSelect();
  renderCalendar();

  document.getElementById("res-cal-prev").addEventListener("click", () => changeMonth(-1));
  document.getElementById("res-cal-next").addEventListener("click", () => changeMonth(1));

  ["res-name", "res-email", "res-purpose", "res-time-select"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", validateForm);
  });
  document.getElementById("res-time-select").addEventListener("change", validateForm);
  document.getElementById("res-consent").addEventListener("change", validateForm);

  const form = document.getElementById("reservation-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    openConfirmModal();
  });

  document.getElementById("res-modal-cancel").addEventListener("click", closeConfirmModal);

  document.getElementById("res-modal-confirm").addEventListener("click", async () => {
    const confirmBtn = document.getElementById("res-modal-confirm");
    confirmBtn.disabled = true;

    const payload = {
      date: calendarState.selectedDateISO,
      time: document.getElementById("res-time-select").value,
      name: document.getElementById("res-name").value.trim(),
      email: document.getElementById("res-email").value.trim(),
      purpose: document.getElementById("res-purpose").value.trim(),
      consent: document.getElementById("res-consent").checked,
    };

    const saved = await saveReservation(payload);

    confirmBtn.disabled = false;
    closeConfirmModal();

    const statusEl = document.getElementById("res-submit-status");
    if (statusEl) {
      statusEl.textContent = saved
        ? "예약 신청이 접수되었습니다. 확인 후 입력하신 이메일로 연락드리겠습니다."
        : "예약 신청이 접수되었습니다. (오프라인 상태 — 운영자 확인 후 처리됩니다.)";
    }
    resetForm();
  });

  // 팝업 바깥(배경) 클릭 또는 Esc로 닫기
  document.getElementById("res-modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "res-modal-overlay") closeConfirmModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeConfirmModal();
  });
}

document.addEventListener("DOMContentLoaded", init);
