// services/ultraNowcastService.js
const axios = require('axios');
const { UltraNowcast } = require('../models');
const getXY = require('../utils/getXY');
const { getBaseDateTimeForUltra } = require('../utils/ultraTime');

const SERVICE_URL =
  process.env.WEATHER_API_URL ||
  'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';

// ✅ .env가 이미 URL-encoded면 그대로 쓰고, 아니면 encode
function getServiceKey() {
  const raw = process.env.WEATHER_API_KEY || '';
  return raw.includes('%') ? raw : encodeURIComponent(raw);
}

function buildParams({ baseDate, baseTime, nx, ny }) {
    const serviceKey = process.env.WEATHER_API_KEY; // ✅ 원문 그대로
    return {
      serviceKey,
      numOfRows: 100,
      pageNo: 1,
      dataType: 'JSON',
      base_date: baseDate,
      base_time: baseTime,
      nx, ny
    };
  }  

function ok(code) {
  // ✅ "00" | "0" | 0 모두 성공으로 처리
  return code === '00' || code === '0' || code === 0;
}

async function fetchAndSaveUltraNowcastByXY({ nx, ny, now = new Date() }) {
  const { baseDate, baseTime } = getBaseDateTimeForUltra(now);
  const params = buildParams({ baseDate, baseTime, nx, ny });

  try {
    // ✅ 요청 로깅(디버그)
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

    let saved = 0;
    for (const it of items) {
      const payload = {
        baseDate: String(it.baseDate || baseDate),
        baseTime: String(it.baseTime || baseTime).padStart(4, '0'),
        nx: Number(it.nx ?? nx),
        ny: Number(it.ny ?? ny),
        category: String(it.category),
        obsrValue: String(it.obsrValue),
      };
      try {
        await UltraNowcast.create(payload);
        saved++;
      } catch (e) {
        if (e?.name === 'SequelizeUniqueConstraintError') continue;
        throw e;
      }
    }

    console.log('[UltraNowcast:saved]', saved, { baseDate, baseTime, nx, ny });
    return saved;
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