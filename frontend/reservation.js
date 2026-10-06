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

// 예약 내용을 운영자 이메일로 전달하는 Formspree 엔드포인트.
// 수신 이메일 주소는 코드가 아니라 Formspree 대시보드의 폼 설정에서 지정한다.
// 폼을 새로 만들면 아래 주소만 바꾸면 된다.
const FORMSPREE_ENDPOINT = "https://formspree.io/f/mkjoggjj";

// 연락처 폼(script.js)과 동일한 패턴: 백엔드가 켜져 있으면 로컬에도 함께 저장되고,
// 꺼져 있으면(현재 배포된 사이트) 조용히 건너뛴다. 이메일 전달은 위 Formspree가
// 담당하므로, 백엔드 저장은 있으면 좋은 보조 기록일 뿐 필수가 아니다.
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
  // 날짜마다 이미 찬 시간이 다르므로 시간 목록을 다시 그린다.
  renderTimeOptions();
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
   4. 희망 시간 드롭다운 (이미 예약된 시간은 "(완료)"로 막는다)
   -------------------------------------------------- */

// 이미 예약이 찬 (날짜, 시간) 집합. "2026-10-15T14:00" 형태의 키로 들고 있다.
const bookedSlots = {
  keys: new Set(),
  loaded: false, // 백엔드에서 현황을 받아왔는지 (못 받아온 경우를 구분하기 위함)
};

/** 날짜+시간을 하나의 키로 묶는다 (백엔드 db/index.js의 slotKey와 같은 규칙). */
function slotKey(date, time) {
  return `${date}T${time}`;
}

function isSlotBooked(date, time) {
  return bookedSlots.keys.has(slotKey(date, time));
}

/** 13:00 ~ 18:00을 30분 간격으로 나눈 시간 목록을 만든다. */
function buildTimeSlots() {
  const { startHour, endHour, stepMinutes } = TIME_RANGE;
  const slots = [];
  let current = new Date(2000, 0, 1, startHour, 0);
  const end = new Date(2000, 0, 1, endHour, 0);

  while (current <= end) {
    const h = String(current.getHours()).padStart(2, "0");
    const m = String(current.getMinutes()).padStart(2, "0");
    slots.push(`${h}:${m}`);
    current = new Date(current.getTime() + stepMinutes * 60000);
  }
  return slots;
}

/**
 * 백엔드에서 "이미 찬 시간" 목록을 받아온다.
 * 이 응답에는 날짜/시간만 들어 있고 신청자 정보는 포함되지 않는다.
 * 백엔드가 꺼져 있으면 현황을 알 수 없으므로, 막지 않고 전부 선택 가능하게 둔다.
 */
async function loadBookedSlots() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${API_BASE_URL}/api/reservations/booked-slots`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    bookedSlots.keys = new Set((data.slots || []).map((s) => slotKey(s.date, s.time)));
    bookedSlots.loaded = true;
  } catch (err) {
    bookedSlots.keys = new Set();
    bookedSlots.loaded = false;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 선택한 날짜에 맞춰 시간 드롭다운을 다시 그린다.
 * 남은 시간은 그대로, 이미 예약된 시간은 "(완료)"를 붙이고 선택할 수 없게 한다.
 */
function renderTimeOptions() {
  const select = document.getElementById("res-time-select");
  const noteEl = document.getElementById("res-time-note");
  if (!select) return;

  const previouslySelected = select.value;
  const dateISO = calendarState.selectedDateISO;

  select.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = dateISO ? "시간을 선택하세요" : "날짜를 먼저 선택하세요";
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  let takenCount = 0;
  buildTimeSlots().forEach((time) => {
    const taken = Boolean(dateISO) && isSlotBooked(dateISO, time);
    if (taken) takenCount += 1;

    const option = document.createElement("option");
    option.value = time;
    option.textContent = taken ? `${time} (완료)` : time;
    option.disabled = taken;
    select.appendChild(option);
  });

  // 날짜를 바꾸기 전에 골라둔 시간이 새 날짜에서도 선택 가능하면 그대로 유지한다.
  const stillSelectable =
    previouslySelected && !(dateISO && isSlotBooked(dateISO, previouslySelected));
  if (stillSelectable) {
    select.value = previouslySelected;
  }

  if (noteEl) {
    if (!dateISO) {
      noteEl.textContent = "";
    } else if (!bookedSlots.loaded) {
      noteEl.textContent = "예약 현황을 확인하지 못했습니다. 선택하신 시간이 이미 찼을 수 있습니다.";
    } else if (previouslySelected && !stillSelectable) {
      noteEl.textContent = "선택하셨던 시간은 이미 예약이 차서 해제되었습니다. 다른 시간을 선택해 주세요.";
    } else if (takenCount > 0) {
      noteEl.textContent = `"(완료)"로 표시된 시간은 이미 예약되어 선택할 수 없습니다.`;
    } else {
      noteEl.textContent = "";
    }
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
   7. 전송 (Formspree 이메일 전달 + 백엔드 보조 저장)
   -------------------------------------------------- */

/**
 * Formspree로 보낼 본문을 만든다.
 * - name / email: Formspree가 알아보는 기본 필드명. email은 자동으로 회신(Reply-To) 주소가 된다.
 * - _subject: 운영자에게 도착하는 메일의 제목.
 * - 그 외 항목은 메일 본문에 적힌 이름 그대로 보이므로 한글 라벨을 쓴다.
 * - _gotcha: 사람이 채우지 않는 숨은 칸(허니팟). 값이 차 있으면 Formspree가 스팸으로 처리한다.
 */
function buildFormspreePayload(data) {
  return {
    name: data.name,
    email: data.email,
    _subject: `[방문 예약] ${data.name} / ${data.dateLabel} ${data.time}`,
    "방문 희망 날짜": `${data.dateLabel} (${data.date})`,
    "희망 시간": data.time,
    "방문 목적": data.purpose,
    "정보 제공 동의": data.consent ? "동의함" : "동의하지 않음",
    _gotcha: data.gotcha || "",
  };
}

/**
 * Formspree로 예약 내용을 전송한다. 이 전송이 성공해야 운영자 이메일로 전달되므로,
 * 실패하면 방문자에게 실패를 그대로 알리고 입력값을 유지해 다시 시도할 수 있게 한다.
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
async function sendToFormspree(data) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Accept 헤더가 있어야 Formspree가 페이지 이동 대신 JSON으로 응답한다.
        Accept: "application/json",
      },
      body: JSON.stringify(buildFormspreePayload(data)),
      signal: controller.signal,
    });

    if (res.ok) {
      return { ok: true, message: "" };
    }

    // Formspree는 실패 시 { errors: [{ message, field }] } 형태로 이유를 알려준다.
    let message = `전송에 실패했습니다. (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (Array.isArray(body?.errors) && body.errors.length > 0) {
        message = body.errors.map((e) => e.message).join(" / ");
      }
    } catch (parseErr) {
      // 응답 본문이 JSON이 아니면 위의 기본 메시지를 그대로 쓴다.
    }
    return { ok: false, message };
  } catch (err) {
    const message =
      err.name === "AbortError"
        ? "응답 시간이 초과되었습니다. 네트워크 상태를 확인하고 다시 시도해 주세요."
        : "네트워크 오류로 전송하지 못했습니다. 다시 시도해 주세요.";
    return { ok: false, message };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 백엔드에 예약을 저장한다. 같은 시간에 이미 예약이 있으면 백엔드가 409로 거절한다.
 * 화면에서 "(완료)"로 막아두긴 하지만, 폼을 열어둔 사이에 다른 사람이 같은 시간을
 * 예약했을 수 있으므로 최종 판단은 항상 백엔드가 한다.
 *
 * 백엔드가 꺼져 있으면(현재 배포된 사이트가 이 경우) 중복 여부를 확인할 방법이
 * 없으므로, 막지 않고 통과시킨다 — 이때 기록은 Formspree 메일로만 남는다.
 *
 * @returns {Promise<{ ok: boolean, conflict: boolean, reachable: boolean, message: string }>}
 */
async function saveReservationToBackend(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${API_BASE_URL}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (res.status === 409) {
      let message = "이미 예약된 시간입니다. 다른 시간을 선택해 주세요.";
      try {
        const body = await res.json();
        if (body?.error) message = body.error;
      } catch (parseErr) {
        // 기본 메시지를 그대로 쓴다.
      }
      return { ok: false, conflict: true, reachable: true, message };
    }

    return { ok: res.ok, conflict: false, reachable: true, message: "" };
  } catch (err) {
    // 백엔드 미실행/네트워크 오류 — 중복 확인 없이 진행한다.
    return { ok: false, conflict: false, reachable: false, message: "" };
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
  renderTimeOptions();
  validateForm();
}

/* --------------------------------------------------
   초기화
   -------------------------------------------------- */

async function init() {
  renderCalendar();
  renderTimeOptions();

  // 이미 찬 시간 목록을 받아온 뒤 드롭다운을 다시 그린다.
  await loadBookedSlots();
  renderTimeOptions();

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
    const statusEl = document.getElementById("res-submit-status");

    confirmBtn.disabled = true;
    confirmBtn.innerHTML = "<span>전송 중...</span>";

    const dateISO = calendarState.selectedDateISO;
    const payload = {
      date: dateISO,
      dateLabel: formatDateLabel(dateISO),
      time: document.getElementById("res-time-select").value,
      name: document.getElementById("res-name").value.trim(),
      email: document.getElementById("res-email").value.trim(),
      purpose: document.getElementById("res-purpose").value.trim(),
      consent: document.getElementById("res-consent").checked,
      gotcha: document.getElementById("res-gotcha")?.value || "",
    };

    const restoreButton = () => {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<span>예약 확정</span> <i class="fa-solid fa-check"></i>';
    };

    // 중복 확인이 먼저다. 이미 찬 시간이면 메일을 보내기 전에 멈춰야,
    // 받아들여지지 않을 예약이 운영자에게 전달되는 일이 없다.
    const backend = await saveReservationToBackend(payload);

    if (backend.conflict) {
      restoreButton();
      closeConfirmModal();

      // 방금 찬 시간이 바로 "(완료)"로 보이도록 현황을 다시 받아온다.
      await loadBookedSlots();
      renderTimeOptions();
      validateForm();

      if (statusEl) {
        statusEl.classList.add("res-submit-status--error");
        statusEl.textContent = `${backend.message} 시간을 다시 선택해 주세요.`;
      }
      return;
    }

    // 운영자 이메일 전달(Formspree). 방문자에게 보여줄 성공 여부의 기준이다.
    const result = await sendToFormspree(payload);

    restoreButton();
    closeConfirmModal();

    if (statusEl) {
      statusEl.classList.toggle("res-submit-status--error", !result.ok);
      statusEl.textContent = result.ok
        ? "예약 신청이 접수되었습니다. 확인 후 입력하신 이메일로 연락드리겠습니다."
        : `예약 신청을 전송하지 못했습니다. ${result.message}`;
    }

    if (result.ok) {
      // 방금 예약한 시간이 다음 신청자에게 "(완료)"로 보이도록 현황을 갱신한다.
      await loadBookedSlots();
      resetForm();
    }
    // 전송에 실패했으면 입력값을 유지해서 바로 다시 시도할 수 있게 한다.
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
