const axios = require('axios');
const getXY = require('../utils/getXY'); // getXY 유틸리티 사용

const serviceKey = process.env.WEATHER_API_KEY;

exports.getWeatherByCoordinates = async (lat, lon) => {
    // 1. 위도와 경도로 가장 가까운 지역의 격자 좌표(nx, ny)를 찾습니다.
    const { nx, ny } = getXY(lat, lon);

    // 2. 현재 날짜와 시간 설정
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const baseDate = `${year}${month}${day}`;

    // 3. API 호출에 사용할 기준 시간을 설정합니다. (단기예보 API 기준)
    // 예시 코드로 05시만 사용했으나, 실제로는 모든 시간대별 기준 시간을 설정해야 합니다.
    const baseTime = "0500"; 

    // 4. 기상청 단기예보 API 호출
    const apiUrl = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';
    const params = {
        serviceKey: serviceKey,
        pageNo: 1,
        numOfRows: 100,
        dataType: 'JSON',
        base_date: baseDate,
        base_time: baseTime,
        nx: nx,
        ny: ny
    };

    const response = await axios.get(apiUrl, { params });
    const items = response.data.response.body.items.item;
    
    if (!items) {
        throw new Error("날씨 정보를 찾을 수 없습니다.");
    }
    
    // 5. 응답 데이터를 필요한 형태로 가공
    const weatherData = {
        temperature: null,
        feels_like: null,
        humidity: null,
        precipitation_amount: null,
        precipitation_probability: null,
        wind_speed: null,
        wind_direction: null,
        weather_condition: null,
    };

    items.forEach(item => {
        switch (item.category) {
            case 'T1H': // 기온
                weatherData.temperature = parseFloat(item.fcstValue);
                break;
            case 'REH': // 습도
                weatherData.humidity = parseInt(item.fcstValue);
                break;
            case 'RN1': // 강수량
                weatherData.precipitation_amount = parseFloat(item.fcstValue);
                break;
            case 'POP': // 강수 확률
                weatherData.precipitation_probability = parseInt(item.fcstValue);
                break;
            case 'WSD': // 풍속
                weatherData.wind_speed = parseFloat(item.fcstValue);
                break;
            case 'VEC': // 풍향
                weatherData.wind_direction = parseInt(item.fcstValue);
                break;
            case 'SKY': // 하늘 상태
                weatherData.weather_condition = getSkyCondition(item.fcstValue);
                break;
        }
    });

    // 6. 체감 온도 계산 (기온, 풍속, 습도 조합)
    const temperature = weatherData.temperature;
    const windSpeed = weatherData.wind_speed;
    if (temperature !== null && windSpeed !== null) {
        weatherData.feels_like = 13.12 + 0.6215 * temperature - 11.37 * Math.pow(windSpeed, 0.16) + 0.3965 * temperature * Math.pow(windSpeed, 0.16);
    }
    
    return weatherData;
};

// 하늘 상태 코드를 문자열로 변환하는 함수
const getSkyCondition = (code) => {
    switch(code) {
        case '1': return '맑음'; 
        case '3': return '구름 많음';
        case '4': return '흐림';
        default: return '알 수 없음';
    }
};