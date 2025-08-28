// controllers/weatherController.js
const weatherService = require('../services/weatherService');

exports.getWeather = async (req, res) => {
  try {
    const { si, gungu, lat, lon } = req.query;

    // 1) si,gungu만 넘어온 경우 (기본 경로)
    if (si && gungu && !lat && !lon) {
      const data = await weatherService.getWeatherByRegion(String(si).trim(), String(gungu).trim());
      return res.status(200).json({ success: true, ...data });
    }

    // 2) 좌표가 넘어온 경우 (si,gungu가 있으면 저장 시 사용)
    if (lat && lon) {
      const data = await weatherService.getWeatherByCoordinates(
        Number(lat),
        Number(lon),
        { si: si || undefined, gungu: gungu || undefined }
      );
      return res.status(200).json({ success: true, ...data });
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
