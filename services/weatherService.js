// services/weatherService.js
const axios = require('axios');
const getXY = require('../utils/getXY');
const { getSunTimes } = require('./sunService');
const locationLookup = require('../utils/locationLookup');

const KMA_KEY = process.env.WEATHER_API_KEY;       // 기상청(인코딩키)
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;  // 선택: Kakao 지오코딩

/* ---------------- 시간 계산 ---------------- */
function baseTimeUltraNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - 10); // 직전 10분대로 내림
  const date = d.toISOString().slice(0,10).replace(/-/g,'');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(Math.floor(d.getMinutes()/10)*10).padStart(2, '0');
  return { base_date: date, base_time: `${hh}${mm}` };
}
function baseTimeVillage() {
  const d = new Date();
  const slots = [2,5,8,11,14,17,20,23];
  let hh = d.getHours();
  let chosen = slots[0];
  for (const h of slots) if (h <= hh) chosen = h;
  if (hh < slots[0]) { d.setDate(d.getDate()-1); chosen = 23; }
  const date = d.toISOString().slice(0,10).replace(/-/g,'');
  return { base_date: date, base_time: String(chosen).padStart(2,'0') + '00' };
}

/* ---------------- 파싱/계산 ---------------- */
function parsePCP(pcp) {
  if (!pcp || pcp === '강수없음') return 0;
  const m = pcp.match(/(\d+)(?:~(\d+))?/);
  if (!m) return null;
  return m[2] ? Number(m[2]) : Number(m[1]);
}
const ms2kmh = v => (v == null ? null : v * 3.6);

function deriveCondition(pty, sky) {
  const p = Number(pty);
  if (!Number.isNaN(p) && p !== 0) {
    const map = {1:'비',2:'비/눈',3:'눈',4:'소나기',5:'빗방울',6:'빗방울/눈날림',7:'눈날림'};
    return map[p] || '강수';
  }
  const s = Number(sky);
  const skyMap = {1:'맑음',3:'구름 많음',4:'흐림'};
  return skyMap[s] || '맑음';
}

function calcFeelsLike(T, RH, WSD) {
  if (T == null) return null;
  const t = Number(T);
  if (Number.isNaN(t)) return null;

  // 추울 때(≤10℃): Wind Chill
  if (t <= 10 && WSD != null) {
    const V = ms2kmh(Number(WSD)) || 0;
    const WCI = 13.12 + 0.6215*t - 11.37*Math.pow(V,0.16) + 0.3965*t*Math.pow(V,0.16);
    return Math.round(WCI*10)/10;
  }
  // 더울 때(≥27℃): Heat Index 근사
  if (t >= 27 && RH != null) {
    const R = Number(RH);
    const HI = -8.784695 + 1.61139411*t + 2.338549*R - 0.14611605*t*R
             - 0.012308094*t*t - 0.016424828*R*R
             + 0.002211732*t*t*R + 0.00072546*t*R*R
             - 0.000003582*t*t*R*R;
    return Math.round(HI*10)/10;
  }
  return Math.round(t*10)/10;
}

/* ---------------- KMA 공통 호출 ---------------- */
async function callKMA(endpoint, params) {
  const base = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';
  const url = `${base}/${endpoint}`;
  const resp = await axios.get(url, {
    params: { serviceKey: KMA_KEY, dataType: 'JSON', ...params },
    timeout: 8000,
  });
  return resp.data?.response?.body?.items?.item || [];
}
const mapByCategory = (items, valueKey) => {
  const out = {};
  for (const it of items) out[it.category] = it[valueKey];
  return out;
};
function nearestFcstMap(items) {
  if (!Array.isArray(items) || items.length === 0) return {};
  const now = new Date();
  const today = now.toISOString().slice(0,10).replace(/-/g,'');
  const todayItems = items.filter(i => i.fcstDate === today);
  const group = {};
  for (const it of todayItems) {
    (group[it.fcstTime] ??= []).push(it);
  }
  const times = Object.keys(group).sort();
  const hhmm = now.toTimeString().slice(0,5).replace(':','');
  const score = t => Math.abs(Number(t) - Number(hhmm));
  let best = times[0] || null;
  for (const t of times) if (score(t) < score(best)) best = t;
  const chosen = group[best] || [];
  const map = {};
  for (const it of chosen) map[it.category] = it.fcstValue;
  return map;
}

/* ---------------- 지오코딩 ---------------- */
async function geocode({ lat, lon, city, district }) {
  // 1) 이미 lat/lon 있는 경우
  if (lat && lon) return { lat: parseFloat(lat), lon: parseFloat(lon) };

  // 2) 내부 테이블(locationLookup) 우선
  if (city) {
    const hit = locationLookup.getLatLonBySiGu?.(city, district);
    if (hit?.lat && hit?.lon) return { lat: parseFloat(hit.lat), lon: parseFloat(hit.lon) };
  }

  // 3) Kakao Local API (선택)
  if (city && district && KAKAO_KEY) {
    const query = `${city} ${district}`;
    const r = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
      params: { query },
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
      timeout: 7000,
    });
    const doc = r.data?.documents?.[0];
    if (doc) return { lat: parseFloat(doc.y), lon: parseFloat(doc.x) };
  }

  const e = new Error('위도와 경도 정보가 필요합니다.');
  e.statusCode = 400;
  e.publicMessage = '위도와 경도 정보가 필요합니다.';
  throw e;
}

/* ---------------- 공개 API ---------------- */
/**
 * lat/lon 또는 city/district 로 호출 가능.
 * 반환: { weather, sun, coords, fetchedAt }
 */
exports.getWeatherByCoordinates = async (latIn, lonIn, opts = {}) => {
  const { lat, lon } = await geocode({ lat: latIn, lon: lonIn, city: opts.city, district: opts.district });

  // 격자
  const { nx, ny } = getXY(lat, lon);

  // KMA 호출: 실황 + 예보
  const ultra = await callKMA('getUltraSrtNcst', { ...baseTimeUltraNow(), nx, ny, numOfRows: 1000, pageNo: 1 });
  const ultraMap = mapByCategory(ultra, 'obsrValue'); // T1H/REH/RN1/WSD/VEC/PTY/SKY

  const vill  = await callKMA('getVilageFcst', { ...baseTimeVillage(),  nx, ny, numOfRows: 1000, pageNo: 1 });
  const fcstMap = nearestFcstMap(vill);              // POP/TMP/PCP/PTY/SKY 등

  // 병합
  const temperature = (ultraMap.T1H ?? fcstMap.TMP) != null ? Number(ultraMap.T1H ?? fcstMap.TMP) : null;
  const humidity    = (ultraMap.REH ?? fcstMap.REH) != null ? Number(ultraMap.REH ?? fcstMap.REH) : null;
  const wind_speed  = (ultraMap.WSD ?? fcstMap.WSD) != null ? Number(ultraMap.WSD ?? fcstMap.WSD) : null;
  const wind_dir    = (ultraMap.VEC ?? fcstMap.VEC) != null ? Number(ultraMap.VEC ?? fcstMap.VEC) : null;

  const rn1 = ultraMap.RN1 != null ? Number(ultraMap.RN1) : null;     // 최근 1시간 강수
  const pcp = fcstMap.PCP != null ? parsePCP(fcstMap.PCP) : null;     // 예보 강수(문자→숫자)
  const precipitation_amount = rn1 ?? pcp;

  const precipitation_probability = fcstMap.POP != null ? Number(fcstMap.POP) : null;

  const condition = deriveCondition(ultraMap.PTY ?? fcstMap.PTY, ultraMap.SKY ?? fcstMap.SKY);
  const feels_like = calcFeelsLike(temperature, humidity, wind_speed);

  // 일출/일몰
  const sun = await getSunTimes(lat, lon);

  return {
    weather: {
      temperature,
      feels_like,
      humidity,
      precipitation_amount,
      precipitation_probability,
      wind_speed,
      wind_direction: wind_dir,
      weather_condition: condition,
    },
    sun,
    coords: { lat: String(lat), lon: String(lon), nx, ny },
    fetchedAt: new Date().toISOString(),
  };
};

/**
 * city/district 로 직접 호출하고 싶을 때 편의 함수
 */
exports.getWeatherByRegion = async (city, district) => {
  const { lat, lon } = await geocode({ city, district });
  return exports.getWeatherByCoordinates(lat, lon);
};

/**
 * 컨트롤러가 기대하는 시그니처:
 *   weatherService.getWeatherMerged({ lat, lon, city, district })
 * 내부적으로:
 *  - lat/lon 없고 city/district가 있으면 locationLookup로 좌표 얻기
 *  - 결국 getWeatherByCoordinates(lat, lon) 호출해서 동일한 형태로 반환
 *  - 매개변수 재할당 없음 (Assignment to const 방지)
 */
exports.getWeatherMerged = async (args = {}) => {
    const { city, district } = args;
  
    let latNum = args.lat != null ? parseFloat(args.lat) : undefined;
    let lonNum = args.lon != null ? parseFloat(args.lon) : undefined;
  
    if ((!latNum || !lonNum) && (city || district)) {
      const hit = require('../utils/locationLookup').getLatLonBySiGu?.(city, district);
      if (!hit?.lat || !hit?.lon) {
        const err = new Error('위도와 경도 정보가 필요합니다.');
        err.statusCode = 400;
        err.publicMessage = '위도와 경도 정보가 필요합니다.';
        throw err;
      }
      latNum = parseFloat(hit.lat);
      lonNum = parseFloat(hit.lon);
    }
  
    if (!latNum || !lonNum) {
      const err = new Error('위도와 경도 정보가 필요합니다.');
      err.statusCode = 400;
      err.publicMessage = '위도와 경도 정보가 필요합니다.';
      throw err;
    }
  
    return exports.getWeatherByCoordinates(latNum, lonNum);
  };