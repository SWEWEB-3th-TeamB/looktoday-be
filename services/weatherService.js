const axios = require('axios');
const getXY = require('../utils/getXY');

const serviceKey = process.env.WEATHER_API_KEY;

exports.getWeatherByCoordinates = async (lat, lon) => {
    const { nx, ny } = getXY(lat, lon);

    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const baseDate = `${year}${month}${day}`;
    const baseTime = "0500";

    const apiUrl = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';
    const params = {
        serviceKey: serviceKey,
        pageNo: 1,
        numOfRows: 100,
        dataType: 'JSON',
        base_date: baseDate,
        base_time: baseTime,
        nx,
        ny
    };

    const response = await axios.get(apiUrl, { params });
    const items = response.data.response.body.items.item;

    if (!items) {
        throw new Error("날씨 정보를 찾을 수 없습니다.");
    }

    // 응답 JSON을 한글 key로 변환
    const weatherData = {
        기온: null,
        체감온도: null,
        습도: null,
        강수량: null,
        강수확률: null,
        풍속: null,
        풍향: null,
        하늘상태: null,
    };

    items.forEach(item => {
        switch (item.category) {
            case 'T1H': // 기온
                weatherData.기온 = `${parseFloat(item.fcstValue)}도`;
                break;
            case 'REH': // 습도
                weatherData.습도 = `${parseInt(item.fcstValue)}%`;
                break;
            case 'RN1': // 강수량
                weatherData.강수량 = `${parseFloat(item.fcstValue)}mm`;
                break;
            case 'POP': // 강수 확률
                weatherData.강수확률 = `${parseInt(item.fcstValue)}%`;
                break;
            case 'WSD': // 풍속
                weatherData.풍속 = `${parseFloat(item.fcstValue)}m/s`;
                break;
            case 'VEC': // 풍향
                const direction = getWindDirection(item.fcstValue);
                weatherData.풍향 = `${direction}(${item.fcstValue}°)`;
                break;
            case 'SKY': // 하늘 상태
                weatherData.하늘상태 = getSkyCondition(item.fcstValue);
                break;
        }
    });

    // 체감온도 계산 후 한글 key로 추가
    const temp = parseFloat(weatherData.기온);
    const wind = parseFloat(weatherData.풍속);
    if (!isNaN(temp) && !isNaN(wind)) {
        const feelsLike = 13.12 + 0.6215 * temp - 11.37 * Math.pow(wind, 0.16) + 0.3965 * temp * Math.pow(wind, 0.16);
        weatherData.체감온도 = `${feelsLike.toFixed(1)}도`;
    }

    return weatherData;
};

// 하늘 상태 코드 변환
const getSkyCondition = (code) => {
    switch (code) {
        case '1': return '맑음';
        case '3': return '구름 많음';
        case '4': return '흐림';
        default: return '알 수 없음';
    }
};

// 풍향 코드 → 한글 변환
const getWindDirection = (degree) => {
    const deg = parseInt(degree);
    if (deg >= 337.5 || deg < 22.5) return "북풍";
    if (deg >= 22.5 && deg < 67.5) return "북동풍";
    if (deg >= 67.5 && deg < 112.5) return "동풍";
    if (deg >= 112.5 && deg < 157.5) return "남동풍";
    if (deg >= 157.5 && deg < 202.5) return "남풍";
    if (deg >= 202.5 && deg < 247.5) return "남서풍";
    if (deg >= 247.5 && deg < 292.5) return "서풍";
    return "북서풍";
};
