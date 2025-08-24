const weatherService = require('../services/weatherService');

exports.getWeather = async (req, res) => {
    const { lat, lon } = req.query;

    // 위도와 경도 정보가 없으면 에러를 반환합니다.
    if (!lat || !lon) {
        return res.status(400).json({
            success: false,
            message: "위도와 경도 정보가 필요합니다."
        });
    }

    try {
        // weatherService에서 날씨 정보를 가져옵니다.
        const weatherData = await weatherService.getWeatherByCoordinates(lat, lon);

        // 성공적으로 데이터를 가져오면 응답합니다.
        return res.status(200).json({
            success: true,
            data: weatherData
        });

    } catch (error) {
        // 날씨 정보를 가져오는 도중 오류가 발생하면 에러를 반환합니다.
        console.error("날씨 정보 조회 오류:", error.message);
        return res.status(500).json({
            success: false,
            message: "날씨 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
        });
    }
};