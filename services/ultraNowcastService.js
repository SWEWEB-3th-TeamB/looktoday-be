// services/ultraNowcastService.js
const axios = require('axios');
const https = require('https');
const db = require('../models');
const { UltraNowcast } = db;
const getXY = require('../utils/getXY');
const locationMap = require('../data/locationMap');

// ✅ HHmm(10분 단위) + fallback 제공 유틸
const { basesWithFallback } = require('../utils/time');

const CAT2COL = {
  T1H: 'tmp', REH: 'reh', WSD: 'wsd', VEC: 'vec',
  UUU: 'uuu', VVV: 'vvv', PTY: 'pty',
  RN1: 'pcp', PCP: 'pcp', LGT: 'lgt',
};

// KMA host / path / optional IP (환경변수로 오버라이드 가능)
const KMA_HOST = 'apis.data.go.kr';
const KMA_PATH = '/1360000/VilageFcstInfoService_2.0';
const KMA_IP   = process.env.KMA_IP || '27.101.208.130';

// 기본(정상 도메인) 클라이언트 - HTTPS (SNI: 도메인)
const KMA_NORMAL = axios.create({
  baseURL: `https://${KMA_HOST}${KMA_PATH}`,
  timeout: 25000,
});

// IP 경유 + Host 헤더 강제 (인증서 체인 검증 유지, SNI에 IP 설정)
// 이 클라이언트는 TLS 검증을 끄지 않고 Host 헤더만 강제하는 방식입니다.
const KMA_VIA_IP = axios.create({
  baseURL: `https://${KMA_IP}${KMA_PATH}`,
  timeout: 25000,
  headers: { Host: KMA_HOST },
  httpsAgent: new https.Agent({
    rejectUnauthorized: true,
    servername: KMA_IP, // SNI를 IP로 설정 (서버가 IP용 cert를 내보낼 때 대비)
  }),
});

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
  return {
    serviceKey,
    numOfRows: 1000,
    pageNo: 1,
    dataType: 'JSON',
    base_date: baseDate,
    base_time: baseTime, // HHmm
    nx, ny,
  };
}

function ok(code) { return code === '00' || code === '0' || code === 0; }
function toNumberSafe(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }

function normalizeValue(cat, v) {
  if (cat === 'PTY') return String(v);
  if (cat === 'RN1' || cat === 'PCP') return String(v);
  return toNumberSafe(v);
}

/** KMA 한 번 호출: 도메인으로 시도, 인증서 altname 에러면 IP 경유로 재시도 */
async function callKmaOnce({ baseDate, baseTime, nx, ny }) {
  const params = buildParams({ baseDate, baseTime, nx, ny });

  // 1) 정상 도메인 시도
  try {
    const { data } = await KMA_NORMAL.get('/getUltraSrtNcst', { params });
    return data;
  } catch (e) {
    // 2) 인증서 호스트명 불일치일 경우(대표 코드)
    const code = String(e?.code || '');
    const msg = e?.message || '';
    if (code === 'ERR_TLS_CERT_ALTNAME_INVALID' || msg.includes('Hostname/IP does not match')) {
      // IP로 재시도
      try {
        const { data } = await KMA_VIA_IP.get('/getUltraSrtNcst', { params });
        return data;
      } catch (e2) {
        // IP 재시도도 실패하면 원래 에러 포함해서 던짐
        const err = new Error('KMA 호출 실패 (도메인 및 IP 재시도 모두 실패)');
        err.original = e;
        err.retry = e2;
        throw err;
      }
    }
    // 그 외 에러는 그대로 throw
    throw e;
  }
}

/** KMA를 10분 단위로 과거로 롤백하며 최초 유효 응답을 upsert */
async function fetchUltraNowcastWithFallback({ nx, ny, si: siOverride, gungu: gunguOverride, hoursBack = 1 }) {
  for (const { baseDate, baseTime } of basesWithFallback(hoursBack)) {
    try {
      console.log('[UltraNowcast:req]', { baseDate, baseTime, nx, ny });
      const data = await callKmaOnce({ baseDate, baseTime, nx, ny });

      const header = data?.response?.header;
      const body   = data?.response?.body;
      if (!header || !ok(header.resultCode)) {
        console.warn('[UltraNowcast:bad-header]', header);
        continue;
      }

      const items = body?.items?.item || [];
      if (!Array.isArray(items) || items.length === 0) {
        console.warn('[UltraNowcast:no-items]', { baseDate, baseTime, nx, ny });
        continue; // 다음 후보 시각으로
      }

      // === 가로형 1행 업서트 ===
      const mapped = getSiGunguByXY(nx, ny);
      const si = siOverride ?? mapped.si ?? '';
      const gungu = gunguOverride ?? mapped.gungu ?? '';

// ⚠️ 저장 시간/좌표는 "요청 슬롯/인자"를 그대로 사용 (응답값으로 덮어쓰지 않음)
const row = {
  baseDate: baseDate,
  baseTime: baseTime,           // ← 응답의 items[0].baseTime 쓰지 않기
  nx: nx,
  ny: ny,
  si, gungu,
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

      await UltraNowcast.upsert(row);
      console.log('[UltraNowcast:upserted]', {
        baseDate: row.baseDate, baseTime: row.baseTime, nx: row.nx, ny: row.ny, si: row.si, gungu: row.gungu,
      });
      return { baseDate: row.baseDate, baseTime: row.baseTime }; // 성공
    } catch (err) {
      // 더 많은 디버그 정보를 로그로 남깁니다.
      console.warn('[UltraNowcast:error]', {
        code: err?.code,
        message: err?.message,
        headerErr: err?.original?.message,
        retryErr: err?.retry?.message,
        response: err?.response?.data ?? null,
      });
      // 다음 후보 시각으로 계속 시도
    }
  }
  return null; // 전부 실패
}

async function fetchAndSaveUltraNowcastByXY({ nx, ny, si, gungu, hoursBack = 1 }) {
  return fetchUltraNowcastWithFallback({ nx, ny, si, gungu, hoursBack });
}

async function fetchAndSaveUltraNowcastByLatLon({ lat, lon, now = new Date() }) {
  const { nx, ny } = getXY(lat, lon);
  return fetchUltraNowcastWithFallback({ nx, ny, hoursBack: 1 });
}

module.exports = {
  fetchUltraNowcastWithFallback,
  fetchAndSaveUltraNowcastByXY,
  fetchAndSaveUltraNowcastByLatLon,
};
