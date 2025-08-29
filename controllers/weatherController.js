// controllers/weatherController.js
const weatherService = require('../services/weatherService'); // DB upsert 포함

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

/** 체감온도(Heat Index) 근사: TMP(℃), REH(%) → ℃ */
function feelsLikeC(tempC, rh) {
  const t = Number(tempC);
  const h = Number(rh);
  if (!Number.isFinite(t) || !Number.isFinite(h)) return null;
  // 온도 낮거나 습도 낮으면 실제 기온 반환
  if (t < 20 || h < 40) return t;
  // NOAA Heat Index (℉) 근사 → ℃ 변환
  const tf = t * 9/5 + 32;
  const hi =
    -42.379 + 2.04901523*tf + 10.14333127*h
    - 0.22475541*tf*h - 0.00683783*tf*tf - 0.05481717*h*h
    + 0.00122874*tf*tf*h + 0.00085282*tf*h*h - 0.00000199*tf*tf*h*h;
  return Math.round(((hi - 32) * 5/9) * 10) / 10;
}

/** SKY/PTY 코드 → 한글 */
const SKY_MAP = { '1': '맑음', '3': '구름 많음', '4': '흐림' };
const PTY_MAP = { '0': '없음', '1': '비', '2': '비/눈', '3': '눈', '4': '소나기' };

/** weatherService 결과 → 예쁜 한글 응답으로 가공 */
function formatPrettyKorean(result) {
  const items = Array.isArray(result?.weather_info) ? result.weather_info : [];

  // ── 메타: 시/군구/날짜/시간 추출 ──
  const si = result?.slot?.si || result?.saved?.si || null;
  const gungu = result?.slot?.gungu || result?.saved?.gungu || null;
  const date = result?.slot?.date || result?.saved?.date || null;   // YYYY-MM-DD
  const time = result?.slot?.time || result?.saved?.time || null;   // HH:00:00

  // fcstTime 매칭용 "HHMM"
  const hhmm = time ? (time.slice(0,2) + time.slice(3,5)) : null;

  const pick = (cat) => {
    const exact = hhmm ? items.find(i => i.category === cat && i.fcstTime === hhmm) : null;
    const any = items.find(i => i.category === cat);
    return (exact || any)?.fcstValue ?? null;
  };

  // 단기예보/초단기 혼용 대비
  const tmp = pick('TMP') ?? pick('T1H');
  const reh = pick('REH');
  const pop = pick('POP');
  const wsd = pick('WSD');
  const vec = pick('VEC');
  const pcp = pick('PCP') ?? pick('RN1');   // PCP(단기), RN1(초단기) → 문자열 보존
  const sky = pick('SKY');
  const pty = pick('PTY');

  const SKY_MAP = { '1': '맑음', '3': '구름 많음', '4': '흐림' };
  const PTY_MAP = { '0': '없음', '1': '비', '2': '비/눈', '3': '눈', '4': '소나기' };
  const weatherKo = (pty && pty !== '0')
    ? (PTY_MAP[pty] || '강수')
    : (sky ? (SKY_MAP[sky] || '알 수 없음') : null);

  const feels = feelsLikeC(tmp, reh);

  // 최종 응답
  return {
    success: true,
    region: { '시': si, '군구': gungu },
    기준시각: { '날짜': date, '시간': time },
    data: {
      '온도': tmp != null ? Number(tmp) : null,
      '체감온도': feels,
      '습도': reh != null ? Number(reh) : null,
      '강수량': pcp ?? null,
      '강수확률': pop != null ? Number(pop) : null,
      '풍속': wsd != null ? Number(wsd) : null,
      '풍향': (vec != null) ? `${windDirKo(vec)} (${Number(vec)}°)` : null,
      '날씨': weatherKo
    }
  };
}

exports.getWeather = async (req, res) => {
  try {
    const { si, gungu, lat, lon } = req.query;

    // 1) si,gungu만 넘어온 경우 (기본 경로) — DB upsert 포함
    if (si && gungu && !lat && !lon) {
      const raw = await weatherService.getWeatherByRegion(String(si).trim(), String(gungu).trim());
      const pretty = formatPrettyKorean(raw);
      return res.status(200).json(pretty);
    }

    // 2) 좌표가 넘어온 경우 — DB upsert 포함(서비스 내부 정책에 따름)
    if (lat && lon) {
      const raw = await weatherService.getWeatherByCoordinates(
        Number(lat),
        Number(lon),
        { si: si || undefined, gungu: gungu || undefined }
      );
      const pretty = formatPrettyKorean(raw);
      return res.status(200).json(pretty);
    }

    // 3) 필수 파라미터 부재
    return res.status(400).json({
      success: false,
      message: 'si,gungu 또는 lat,lon 정보가 필요합니다.',
    });
  } catch (error) {
    console.error('날씨 정보 조회 오류:', error);
    return res.status(502).json({
      success: false,
      message: '날씨 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
      detail: error.message, // 개발 중엔 유지, 배포 시 제거 권장
    });
  }
};
