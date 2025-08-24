// controllers/weatherController.js
const weatherService = require('../services/weatherService');
const weatherSaver = require('../services/weatherSaver');
const { getLatLonBySiGu, getByQuery } = require('../utils/locationLookup');

// ★ 버전 태그: 이 줄이 부팅 로그에 보이면 새 파일이 로드된 것!
console.log('[weatherController] v3-loaded');

exports.getWeather = async (req, res) => {
  try {
    const q = req.query;

    // 1) 최종 사용할 좌표만 지역 변수로 (req.query는 절대 수정/재할당 안 함)
    let latNum = q.lat != null ? parseFloat(q.lat) : undefined;
    let lonNum = q.lon != null ? parseFloat(q.lon) : undefined;

    // city/district → 좌표 변환 (정규 → 폴백)
    if ((!latNum || !lonNum) && (q.city || q.district)) {
      let found;
      if (q.city) found = getLatLonBySiGu(q.city, q.district);
      if (!found) {
        const single = [q.city, q.district].filter(Boolean).join(' ');
        found = getByQuery(single);
      }
      if (!found?.lat || !found?.lon) {
        return res.status(400).json({ success: false, message: '해당 지역의 좌표를 찾을 수 없습니다.' });
      }
      latNum = parseFloat(found.lat);
      lonNum = parseFloat(found.lon);
    }

    // 2) 좌표 검증
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
      return res.status(400).json({ success: false, message: '위도와 경도 정보가 필요합니다.' });
    }

    // 3) 날씨 조회 (안정 경로)
    let wx;
    try {
      wx = await weatherService.getWeatherByCoordinates(latNum, lonNum);
    } catch (e) {
      console.error('[weatherController:getWeatherByCoordinates] fail', {
        status: e.response?.status, data: e.response?.data, msg: e.message, latNum, lonNum,
      });
      throw e;
    }

    // 4) DB upsert (1시간 스냅샷)
    await weatherSaver.saveSnapshot({
      weather: wx.weather,
      sun: wx.sun,
      coords: wx.coords,
      fetchedAt: wx.fetchedAt || new Date().toISOString(),
    });

    // 5) 응답
    return res.json({
      success: true,
      data: {
        weather: wx.weather,
        sun: wx.sun,
        coords: wx.coords,
        fetchedAt: wx.fetchedAt || new Date().toISOString(),
      },
    });
  } catch (err) {
    // ★ 스택까지 출력해서 어디서 던졌는지 보자
    console.error('[weatherController] ', err?.message || err, '\n', err?.stack);
    return res.status(err.statusCode || 502).json({
      success: false,
      message: err.publicMessage || '외부 API 오류/타임아웃',
    });
  }
};
