/* ==========================================================================
   VISIT PAGE — 찾아오는 길 (지도 + 실시간 날씨)
   나중에 주소/좌표가 바뀌면 아래 CONFIG 값만 수정하면 된다.
   ========================================================================== */

const VISIT_CONFIG = {
  // 상명대학교 천안캠퍼스 B306 (사용자 제공 주소 기준, 좌표는 공개 지도 서비스로 확인)
  addressLabel: "상명대학교 천안캠퍼스 B306",
  addressDetail: "충청남도 천안시 동남구 상명대길 31",
  lat: 36.833359,
  lon: 127.179527,
  mapZoom: 17,
  timezone: "Asia/Seoul",
};

/**
 * Google 지도 "output=embed" 방식으로 iframe src를 만든다.
 * API 키가 필요 없는 간단한 임베드 방식이라, 출처 표기만 작게 남긴다.
 */
function buildMapEmbedUrl(config) {
  const { lat, lon, mapZoom } = config;
  return `https://maps.google.com/maps?q=${lat},${lon}&z=${mapZoom}&output=embed`;
}

/**
 * Open-Meteo(무료, 키 불필요) API로 현재 기온/습도를 가져온다.
 * 문서: https://open-meteo.com/
 */
async function fetchCurrentWeather(config) {
  const { lat, lon, timezone } = config;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m&timezone=${encodeURIComponent(timezone)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`날씨 API 응답 오류: ${response.status}`);
  }

  const data = await response.json();
  return {
    temperature: data?.current?.temperature_2m,
    temperatureUnit: data?.current_units?.temperature_2m ?? "°C",
    humidity: data?.current?.relative_humidity_2m,
    humidityUnit: data?.current_units?.relative_humidity_2m ?? "%",
    observedAt: data?.current?.time,
  };
}

function renderAddress(config) {
  const labelEl = document.getElementById("visit-address-label");
  const detailEl = document.getElementById("visit-address-detail");
  if (labelEl) labelEl.textContent = config.addressLabel;
  if (detailEl) detailEl.textContent = config.addressDetail;
}

function renderMap(config) {
  const mapFrame = document.getElementById("visit-map-frame");
  if (!mapFrame) return;
  mapFrame.src = buildMapEmbedUrl(config);
}

function renderWeatherLoading() {
  const el = document.getElementById("visit-weather-status");
  if (el) el.textContent = "날씨 정보를 불러오는 중...";
}

function renderWeatherResult(weather) {
  const tempEl = document.getElementById("visit-weather-temp");
  const humidityEl = document.getElementById("visit-weather-humidity");
  const statusEl = document.getElementById("visit-weather-status");

  if (tempEl) {
    tempEl.textContent =
      weather.temperature !== undefined ? `${weather.temperature}${weather.temperatureUnit}` : "정보 없음";
  }
  if (humidityEl) {
    humidityEl.textContent =
      weather.humidity !== undefined ? `${weather.humidity}${weather.humidityUnit}` : "정보 없음";
  }
  if (statusEl) statusEl.textContent = "";
}

function renderWeatherError() {
  const statusEl = document.getElementById("visit-weather-status");
  if (statusEl) statusEl.textContent = "날씨 정보를 불러오지 못했습니다.";
}

async function initWeather(config) {
  renderWeatherLoading();
  try {
    const weather = await fetchCurrentWeather(config);
    renderWeatherResult(weather);
  } catch (err) {
    console.error(err);
    renderWeatherError();
  }
}

function init() {
  renderAddress(VISIT_CONFIG);
  renderMap(VISIT_CONFIG);
  initWeather(VISIT_CONFIG);
}

document.addEventListener("DOMContentLoaded", init);
