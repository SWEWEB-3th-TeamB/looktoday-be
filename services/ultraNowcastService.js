const axios = require('axios');
const db = require('../models');
const { UltraNowcast } = db;
const getXY = require('../utils/getXY');
const { getBaseDateTimeForUltra } = require('../utils/ultraTime');
const locationMap = require('../data/locationMap');

const SERVICE_URL =
  process.env.WEATHER_API_URL ||
  'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';

// 카테고리 → 컬럼 매핑
const CAT2COL = {
  T1H: 'tmp',   // 기온
  REH: 'reh',   // 습도
  WSD: 'wsd',   // 풍속
  VEC: 'vec',   // 풍향
  UUU: 'uuu',   // 동서바람
  VVV: 'vvv',   // 남북바람
  PTY: 'pty',   // 강수형태 코드(문자 그대로 저장)
  RN1: 'pcp',   // 1시간 강수량 (문자 보존: '강수없음' 등)
  PCP: 'pcp',   // 일부 응답에서 PCP로 올 수도 있어 대비
  LGT: 'lgt',   // 낙뢰 (있으면)
};

function getSiGunguByXY(nx, ny) {
  for (const si of Object.keys(locationMap)) {
    for (const d of locationMap[si]) {
      if (d.nx === nx && d.ny === ny) return { si, gungu: d.district };
    }
  }
  return { si: null, gungu: null };
}

function buildParams({ baseDate, baseTime, nx, ny }) {
  const serviceKey = process.env.WEATHER_API_KEY;
  return { serviceKey, numOfRows: 100, pageNo: 1, dataType: 'JSON', base_date: baseDate, base_time: baseTime, nx, ny };
}

function ok(code) { return code === '00' || code === '0' || code === 0; }

// 숫자로 안전 변환(안되면 null)
function toNumberSafe(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeValue(cat, v) {
  // PTY/PCP(RN1)는 문자열 보존, 나머지는 숫자 변환
  if (cat === 'PTY') return String(v);
  if (cat === 'RN1' || cat === 'PCP') return String(v);
  return toNumberSafe(v);
}

async function fetchAndSaveUltraNowcastByXY({ nx, ny, si: siOverride, gungu: gunguOverride, now = new Date() }) {
  const { baseDate, baseTime } = getBaseDateTimeForUltra(now);
  const params = buildParams({ baseDate, baseTime, nx, ny });

  try {
    console.log('[UltraNowcast:req]', { baseDate, baseTime, nx, ny });

    const { data } = await axios.get(SERVICE_URL, { params, timeout: 12000 });
    const header = data?.response?.header;
    const body = data?.response?.body;

    if (!header || !ok(header.resultCode)) {
      console.warn('[UltraNowcast:bad-header]', header);
      return null;
    }

    const items = body?.items?.item || [];
    if (!Array.isArray(items) || items.length === 0) {
      console.warn('[UltraNowcast:no-items]', { baseDate, baseTime, nx, ny });
      return null;
    }

    // === 가로형 1행 업서트 준비 ===
    const mapped = getSiGunguByXY(nx, ny);

    // 🔹 null 방지: 세종처럼 gungu 없는 지역도 빈 문자열로 처리
    const si = siOverride ?? mapped.si ?? '';
    const gungu = gunguOverride ?? mapped.gungu ?? '';

    const row = {
      baseDate: String(items[0].baseDate || baseDate),
      baseTime: String(items[0].baseTime || baseTime).padStart(4, '0'),
      nx: Number(items[0].nx ?? nx),
      ny: Number(items[0].ny ?? ny),
      si,                        // 항상 문자열
      gungu,                     // 항상 문자열
      tmp: null, reh: null, wsd: null, vec: null,
      uuu: null, vvv: null, pty: null, pcp: null, lgt: null,
    };

    for (const it of items) {
      const cat = String(it.category || '').toUpperCase();
      const col = CAT2COL[cat];
      if (!col) continue;
      const raw = it.obsrValue ?? it.fcstValue ?? null;
      row[col] = normalizeValue(cat, raw);
    }

    // 키 충돌 시 업데이트 (모델에 unique index 필요)
    await UltraNowcast.upsert(row);

    console.log('[UltraNowcast:upserted]', {
      baseDate: row.baseDate,
      baseTime: row.baseTime,
      nx: row.nx,
      ny: row.ny,
      si: row.si,
      gungu: row.gungu
    });

    return 1;
  } catch (err) {
    console.error('[UltraNowcast:error]', err?.response?.data || err.message);
    return null;
  }
}

async function fetchAndSaveUltraNowcastByLatLon({ lat, lon, now = new Date() }) {
  const { nx, ny } = getXY(lat, lon);
  return fetchAndSaveUltraNowcastByXY({ nx, ny, now });
}

module.exports = {
  fetchAndSaveUltraNowcastByXY,
  fetchAndSaveUltraNowcastByLatLon,
};
