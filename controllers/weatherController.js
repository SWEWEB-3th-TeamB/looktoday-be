// controllers/weatherController.js
const db = require('../models');
const { UltraNowcast } = db;
const locationMap = require('../data/locationMap');
const { ApiResponse } = require('../response');

// ✅ KST 정시 계산 유틸
const { currentBaseKST, basesWithFallback, ZONE } = require('../utils/time');

/** 풍향(deg) → 한글 방위 */
function windDirKo(deg) {
  const d = Number(deg);
  if (!Number.isFinite(d)) return null;
  if (d >= 337.5 || d < 22.5) return '북풍';
  if (d < 67.5)  return '북동풍';
  if (d < 112.5) return '동풍';
  if (d < 157.5) return '남동풍';
  if (d < 202.5) return '남풍';
  if (d < 247.5) return '남서풍';
  if (d < 292.5) return '서풍';
  return '북서풍';
}

/** 체감온도(간단 근사) */
function feelsLikeC(tempC, rh) {
  const t = Number(tempC);
  const h = Number(rh);
  if (!Number.isFinite(t) || !Number.isFinite(h)) return null;
  if (t < 20 || h < 40) return t;
  const tf = t * 9/5 + 32;
  const hi =
    -42.379 + 2.04901523*tf + 10.14333127*h
    - 0.22475541*tf*h - 0.00683783*tf*tf - 0.05481717*h*h
    + 0.00122874*tf*tf*h + 0.00085282*tf*h*h - 0.00000199*tf*tf*h*h;
  return Math.round(((hi - 32) * 5/9) * 10) / 10;
}

const PTY_LABEL = {
  '0': '강수 없음', '1': '비', '2': '비/눈', '3': '눈',
  '4': '소나기', '5': '빗방울', '6': '빗방울/눈날림', '7': '눈날림',
};

// ---------- 지역 정규화 & 좌표 매핑 ----------
const normCity = (s) => String(s ?? '')
  .trim()
  .replace(/특별시|광역시/g, '시')
  .replace(/시$/, '')
  .replace(/\s+/g, '');

const normGu = (s) => String(s ?? '')
  .trim()
  .replace(/구$/, '')
  .replace(/\s+/g, '');

/** 시/군구 → nx,ny  (키/표기 차이를 최대한 흡수) */
function getNxNyFlexible(siRaw, gunguRaw) {
  const siKeyNorm = normCity(siRaw);
  const guKeyNorm = normGu(gunguRaw);

  // 1) 시도 키 매칭 (locationMap의 실제 키를 찾아줌)
  const cityKey = Object.keys(locationMap).find(k => normCity(k) === siKeyNorm);
  if (!cityKey) return null;

  const arr = locationMap[cityKey];
  if (!Array.isArray(arr)) return null;

  // 2) 구/군 매칭 (district 필드 기준, 표기차 흡수)
  const found = arr.find(d => {
    const cand = d.district ?? d.gu ?? d.name ?? '';
    const nk = normGu(cand);
    return nk === guKeyNorm || nk.replace(/(시|군|구)$/, '') === guKeyNorm;
  });

  if (!found) return null;
  const { nx, ny } = found;
  if (nx == null || ny == null) return null;
  return { nx, ny };
}

// ---------- DB row 변환 ----------
/** row(가로형 1행) → [{category, obsrValue}] 배열로 변환 */
function rowToItems(row) {
  const items = [];
  if (row.tmp != null) items.push({ category: 'T1H', obsrValue: row.tmp });
  if (row.reh != null) items.push({ category: 'REH', obsrValue: row.reh });
  if (row.wsd != null) items.push({ category: 'WSD', obsrValue: row.wsd });
  if (row.vec != null) items.push({ category: 'VEC', obsrValue: row.vec });
  if (row.uuu != null) items.push({ category: 'UUU', obsrValue: row.uuu });
  if (row.vvv != null) items.push({ category: 'VVV', obsrValue: row.vvv });
  if (row.pty != null) items.push({ category: 'PTY', obsrValue: row.pty });
  if (row.pcp != null) items.push({ category: 'RN1', obsrValue: row.pcp }); // 강수량은 RN1로
  if (row.lgt != null) items.push({ category: 'LGT', obsrValue: row.lgt });
  return items;
}

/** 카테고리 배열 → 요약/원시 맵 */
function buildMaps(rows) {
  const byCat = {};
  for (const r of rows) byCat[r.category] = String(r.obsrValue);

  const tmp = byCat.T1H != null ? Number(byCat.T1H) : null;
  const reh = byCat.REH != null ? Number(byCat.REH) : null;
  const wsd = byCat.WSD != null ? Number(byCat.WSD) : null;
  const vec = byCat.VEC != null ? Number(byCat.VEC) : null;
  const rn1 = byCat.RN1 ?? null;
  const pty = byCat.PTY ?? null;

  const summary = {
    '온도': tmp,
    '체감온도': feelsLikeC(tmp, reh),
    '습도': reh,
    '강수량': rn1,
    '강수확률': null,            // DB 실황에는 POP 없음
    '풍속': wsd,
    '풍향': vec != null ? `${windDirKo(vec)} (${vec}°)` : null,
    '날씨': pty ? (PTY_LABEL[pty] || `코드 ${pty}`) : null,
  };

  return { summary, raw: byCat };
}

// ---------- Core 함수 (req/res 없이 재사용 가능) ----------
async function getWeatherCore(siInput, gunguInput) {
  const si = normCity(siInput);
  const gungu = normGu(gunguInput);

  if (!si || !gungu) {
    throw { code: 'WEATHER400', message: '시, 군구 정보가 필요합니다.' };
  }

  const loc = getNxNyFlexible(si, gungu);
  if (!loc) {
    throw { code: 'WEATHER404', message: `좌표를 찾을 수 없습니다: ${siInput} ${gunguInput}` };
  }
  const { nx, ny } = loc;

  let chosen = null;
  let rows = null;
  let originalRow = null;

  for (const { baseDate, baseTime } of basesWithFallback(3)) {
    const found = await UltraNowcast.findOne({
      where: { baseDate, baseTime, nx, ny },
      order: [['id', 'DESC']],
    });
    if (found) {
      chosen = { baseDate, baseTime };
      rows = rowToItems(found);
      originalRow = found;
      break;
    }
  }

  if (!rows) return null;

  const { summary, raw } = buildMaps(rows);

  return {
    success: true,
    region: { '시': siInput, '군구': gunguInput },
    기준시각: {
      '날짜': `${chosen.baseDate.slice(0,4)}-${chosen.baseDate.slice(4,6)}-${chosen.baseDate.slice(6,8)}`,
      '시간': `${chosen.baseTime.slice(0,2)}:00:00`,
      '표준시': ZONE,
    },
    data: {
      summary,
      raw,
      originalRow,
      meta: { baseDate: chosen.baseDate, baseTime: chosen.baseTime, nx, ny },
    },
  };
}

// ---------- Express 라우트 핸들러 ----------
exports.getWeather = async (req, res) => {
  try {
    // 디버그용 현재 기준시각 헤더
    const probe = currentBaseKST();
    res.setHeader('X-Base-Date', probe.baseDate);
    res.setHeader('X-Base-Time', probe.baseTime);
    res.setHeader('X-Base-TZ', ZONE);

    const result = await getWeatherCore(req.query.si, req.query.gungu);

    if (!result) {
      // 데이터가 진짜로 없는 경우
      return res.status(204).send();
    }

    res.set('Cache-Control', 'public, max-age=60');
    return res.status(200).json(
      ApiResponse.success({
        code: 'WEATHER200',
        message: '날씨 데이터 조회 성공',
        result,
      })
    );
  } catch (err) {
    if (err && err.code && err.message) {
      const status = err.code === 'WEATHER400' ? 400
                    : err.code === 'WEATHER404' ? 404
                    : 400;
      return res.status(status).json(ApiResponse.fail(err));
    }
    console.error('[GET /api/weather] error', err);
    return res.status(500).json(
      ApiResponse.fail({
        code: 'WEATHER500',
        message: '서버 오류',
        error: { detail: err?.message }
      })
    );
  }
};

// Core 함수 외부 재사용을 위해 export
exports.getWeatherCore = getWeatherCore;
