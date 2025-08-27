const axios = require('axios');
const getXY = require('../utils/getXY');
const { Weather } = require('../models');
const locationMap = require('../data/locationMap'); // 시/군구 → nx, ny 매핑

const serviceKey = process.env.WEATHER_API_KEY;

// 최근 발표시각 계산 (02,05,08,11,14,17,20,23시)
const getBaseTime = (date = new Date()) => {
  const anchors = [2, 5, 8, 11, 14, 17, 20, 23].map(h => h * 100);
  const HH = date.getHours();
  const mm = date.getMinutes();
  const nowMinus = HH * 100 + Math.max(0, mm - 15); // 15분 마진
  let chosen = 200;
  for (const t of anchors) if (nowMinus >= t) chosen = t;
  return String(chosen).padStart(4, '0');
};

// "HHMM" → "HH:00:00"
const toTimeStr = (hhmm) => `${hhmm.slice(0, 2)}:00:00`;

// 하늘 상태 코드 변환
const getSkyCondition = (code) => {
  switch (String(code)) {
    case '1': return '맑음';
    case '3': return '구름 많음';
    case '4': return '흐림';
    default:  return '알 수 없음';
  }
};

// 풍향 코드 → 한글
const getWindDirection = (degree) => {
  const deg = parseFloat(degree);
  if (isNaN(deg)) return '알 수 없음';
  if (deg >= 337.5 || deg < 22.5) return "북풍";
  if (deg >= 22.5 && deg < 67.5) return "북동풍";
  if (deg >= 67.5 && deg < 112.5) return "동풍";
  if (deg >= 112.5 && deg < 157.5) return "남동풍";
  if (deg >= 157.5 && deg < 202.5) return "남풍";
  if (deg >= 202.5 && deg < 247.5) return "남서풍";
  if (deg >= 247.5 && deg < 292.5) return "서풍";
  return "북서풍";
};

// API에서 raw items 가져오기 (nx, ny, baseDate 사용)
async function fetchWeatherItems(nx, ny, baseDate) {
  const baseTime = getBaseTime(new Date());
  const apiUrl = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";
  const params = {
    serviceKey,
    pageNo: 1,
    numOfRows: 1000,
    dataType: "JSON",
    base_date: baseDate,
    base_time: baseTime,
    nx,
    ny,
  };
  const response = await axios.get(apiUrl, { params });
  return response?.data?.response?.body?.items?.item || [];
}

// si, gungu로 nx, ny 찾기 (locationMap의 district 기준)
function findGridByRegion(si, gungu) {
  const list = locationMap[si] || [];
  const normalize = (s) => String(s || '').replace(/\s+/g, '');
  const target = list.find(loc => normalize(loc.district) === normalize(gungu))
              || list.find(loc => normalize(gungu).includes(normalize(loc.district)))
              || null;
  return target ? { nx: target.nx, ny: target.ny } : null;
}

// 프론트가 si, gungu만 보낼 때 사용하는 진입점
exports.getWeatherByRegion = async (si, gungu) => {
  const grid = findGridByRegion(si, gungu);
  if (!grid) throw new Error(`지역 매핑 실패: ${si} ${gungu}`);

  const now = new Date();
  const targetDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
  const targetTime = `${String(now.getHours()).padStart(2,"0")}00`; // HH00

  // 최초 호출
  const initialItems = await fetchWeatherItems(grid.nx, grid.ny, targetDate);
  if (!Array.isArray(initialItems) || initialItems.length === 0) {
    throw new Error("날씨 데이터를 불러올 수 없습니다.");
  }

  // description 간단 요약 (optional)
  const weatherSummary = initialItems.filter(
    it => ["T1H", "SKY", "POP"].includes(it.category)
  );

  const sky = weatherSummary.find(it => it.category === "SKY")?.fcstValue;
  const temp = weatherSummary.find(it => it.category === "T1H")?.fcstValue;
  const pop = weatherSummary.find(it => it.category === "POP")?.fcstValue;

  const description = [
    sky ? getSkyCondition(sky) : "",
    temp ? `${temp}도` : "",
    pop ? `/ 강수확률 ${pop}%` : "",
  ].join(" ").trim();

  const dateStr = `${targetDate.slice(0,4)}-${targetDate.slice(4,6)}-${targetDate.slice(6,8)}`;
  const timeStr = toTimeStr(targetTime); // "HH:00:00"

  // **API 원본 items 전체를 저장**
  await Weather.upsert({
    si,
    gungu,
    date: dateStr,
    time: timeStr,
    weather_info: initialItems,  // ← 원본 저장
    description,
  });

  const saved = await Weather.findOne({ where: { si, gungu, date: dateStr, time: timeStr } });

  return {
    slot: { date: dateStr, time: timeStr, si, gungu },
    weather_info: initialItems,
    saved: saved?.toJSON?.() || null,
  };
};
