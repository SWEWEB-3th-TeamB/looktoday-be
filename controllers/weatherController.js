const db = require('../models');
const { UltraNowcast } = db;
const locationMap = require('../data/locationMap');
const { ApiResponse } = require('../response');

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

/** 시/군구 → nx,ny */
function getNxNy(si, gungu) {
  const arr = locationMap[si];
  if (!arr) return null;
  return arr.find(d => d.district === gungu) || null;
}

/** 현재 정시(HH00) */
function currentBase() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const H = String(now.getHours()).padStart(2, '0');
  return { baseDate: `${y}${m}${d}`, baseTime: `${H}00` };
}

/** baseDate/time에서 시간 ±offset */
function shift(baseDate, baseTime, hourOffset) {
  const y = Number(baseDate.slice(0,4));
  const mo = Number(baseDate.slice(4,6)) - 1;
  const da = Number(baseDate.slice(6,8));
  const H = Number(baseTime.slice(0,2));
  const dt = new Date(y, mo, da, H, 0, 0);
  dt.setHours(dt.getHours() + hourOffset);
  const Y = dt.getFullYear();
  const M = String(dt.getMonth() + 1).padStart(2, '0');
  const D = String(dt.getDate()).padStart(2, '0');
  const HH = String(dt.getHours()).padStart(2, '0');
  return { baseDate: `${Y}${M}${D}`, baseTime: `${HH}00` };
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
    '강수확률': null,            // DB 실황에는 POP 없음 → null
    '풍속': wsd,
    '풍향': vec != null ? `${windDirKo(vec)} (${vec}°)` : null,
    '날씨': pty ? (PTY_LABEL[pty] || `코드 ${pty}`) : null,
  };

  return { summary, raw: byCat };
}

/**
 * GET /api/weather?si=서울특별시&gungu=종로구
 * - 프론트 변경 0
 * - DB(ultra_nowcast)에서 최신 실황을 읽어 예쁜 한글 포맷으로 응답
 */
exports.getWeather = async (req, res) => {
  try {
    const { si, gungu } = req.query;
    if (!si || !gungu) {
      return res.status(400).json(
        ApiResponse.fail({ code: 'WEATHER400', message: '시, 군구 정보가 필요합니다.' })
      );
    }

    const loc = getNxNy(String(si).trim(), String(gungu).trim());
    if (!loc) {
      return res.status(404).json(
        ApiResponse.fail({ code: 'WEATHER404', message: `좌표를 찾을 수 없습니다: ${si} ${gungu}` })
      );
    }
    const { nx, ny } = loc;

    // 크론이 매 시각 10분에 HH00 기준 데이터를 넣으므로,
    // 현재 정시 → 없으면 -1h → -2h 순으로 폴백
    const nowBase = currentBase();
    const candidates = [
      nowBase,
      shift(nowBase.baseDate, nowBase.baseTime, -1),
      shift(nowBase.baseDate, nowBase.baseTime, -2),
    ];

    let chosen = null;
    let rows = null;

    for (const c of candidates) {
      const found = await UltraNowcast.findAll({
        where: { baseDate: c.baseDate, baseTime: c.baseTime, nx, ny },
        order: [['category', 'ASC']],
      });
      if (found?.length) {
        chosen = c;
        rows = found.map(r => ({ category: r.category, obsrValue: r.obsrValue }));
        break;
      }
    }

    if (!rows) {
      // 아직 수집 전/지연 중
      return res.status(204).json(); // No Content
    }

    const { summary } = buildMaps(rows);

    const pretty = {
      success: true,
      region: { '시': si, '군구': gungu },
      기준시각: {
        '날짜': `${chosen.baseDate.slice(0,4)}-${chosen.baseDate.slice(4,6)}-${chosen.baseDate.slice(6,8)}`,
        '시간': `${chosen.baseTime.slice(0,2)}:00:00`,
      },
      data: summary,
    };

    res.set('Cache-Control', 'public, max-age=60');
    return res.status(200).json(
      ApiResponse.success({
        code: 'WEATHER200',
        message: '날씨 데이터 조회 성공',
        result: pretty,
      })
    );
  } catch (err) {
    console.error('[GET /api/weather] error', err);
    return res.status(500).json(
      ApiResponse.fail({
        code: 'WEATHER500',
        message: '서버 오류',
        error: { detail: err.message },
      })
    );
  }
};
