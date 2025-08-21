const express = require('express');
const axios = require('axios');
require('dotenv').config(); // 이 코드가 .env 파일의 내용을 불러옵니다.
const app = express();
const port = 3000;

// locationMap.js 파일 불러오기 (경로 수정 필요)
const locationMap = require('./data/locationMap.js');

// 기상청 API 키를 .env 파일에서 가져옵니다.
const KMA_API_KEY = encodeURIComponent(process.env.WEATHER_API_KEY);
const KMA_API_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";

// 격자 변환 함수
const RE = 6371.00877;
const GRID = 5.0;
const SLAT1 = 30.0;
const SLAT2 = 60.0;
const OLON = 126.0;
const OLAT = 38.0;
const XO = 43;
const YO = 136;
const DEGRAD = Math.PI / 180.0;

function lat_lon_to_grid_xy(lat, lon) {
    const sn = Math.tan(Math.PI * 0.25 + SLAT2 * DEGRAD) / Math.tan(Math.PI * 0.25 + SLAT1 * DEGRAD);
    const n = Math.log(Math.cos(SLAT1 * DEGRAD) / Math.cos(SLAT2 * DEGRAD)) / Math.log(sn);
    const sf = Math.tan(Math.PI * 0.25 + SLAT1 * DEGRAD);
    const ro = RE / GRID * Math.cos(SLAT1 * DEGRAD) / n * Math.pow(sf, n);

    const rs = {};
    rs.lat = lat;
    rs.lon = lon;

    let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD);
    ra = RE / GRID * Math.cos(SLAT1 * DEGRAD) / n * Math.pow(ra, n);
    let theta = lon * DEGRAD - OLON * DEGRAD;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= n;

    rs.nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
    rs.ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

    return {
        nx: rs.nx,
        ny: rs.ny
    };
}

// locationMap에서 위도/경도 찾는 함수
function findCoordinates(city, district) {
    const provinceData = locationMap[city];
    if (provinceData) {
        const location = provinceData.find(loc => loc.district === district);
        if (location) {
            return { lat: location.lat, lon: location.lon };
        }
    }
    return null;
}

app.get('/api/weather', async (req, res) => {
    console.log('API 요청이 서버에 도착했습니다.');
    // 1. 요청에서 시/도와 구/군 이름을 받기
    const city = req.query.city;
    const district = req.query.district;

    if (!city || !district) {
        return res.status(400).json({
            success: false,
            message: "시/도와 구/군 정보가 필요합니다."
        });
    }

    // 2. locationMap에서 위도/경도 찾기
    const coordinates = findCoordinates(city, district);
    if (!coordinates) {
        return res.status(404).json({
            success: false,
            message: "해당하는 위치 정보를 찾을 수 없습니다."
        });
    }

    const { lat, lon } = coordinates;
    
    try {
        // 3. 위도/경도 -> 격자 좌표 변환
        const { nx, ny } = lat_lon_to_grid_xy(parseFloat(lat), parseFloat(lon));
        
        // 4. 기상청 API 호출을 위한 base_date, base_time 설정
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');
        const base_date = `${year}${month}${date}`;
        
        let base_time;
        const hour = now.getHours();
        if (now.getMinutes() < 45) {
            const prevHour = hour === 0 ? 23 : hour - 1;
            base_time = `${String(prevHour).padStart(2, '0')}30`;
        } else {
            base_time = `${String(hour).padStart(2, '0')}30`;
        }
        
        const params = {
            serviceKey: KMA_API_KEY,
            pageNo: 1,
            numOfRows: 10,
            dataType: 'JSON',
            base_date: base_date,
            base_time: base_time,
            nx: nx,
            ny: ny
        };
        
        console.log("기상청 API 요청 시작:", params); 
        const kmaResponse = await axios.get(KMA_API_URL, { params });
        console.log("기상청 API 응답 성공"); 
        
        const kmaData = kmaResponse.data.response.body.items.item;

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

        kmaData.forEach(item => {
            switch (item.category) {
                case 'T1H':
                    weatherData.temperature = parseFloat(item.fcstValue);
                    break;
                case 'REH':
                    weatherData.humidity = parseInt(item.fcstValue);
                    break;
                case 'WSD':
                    weatherData.wind_speed = parseFloat(item.fcstValue);
                    break;
                case 'PTY':
                    if (item.fcstValue !== '0') {
                        weatherData.weather_condition = "비";
                    } else {
                        weatherData.weather_condition = "맑음";
                    }
                    break;
                case 'SKY':
                    if (weatherData.weather_condition === null) {
                        switch (item.fcstValue) {
                            case '1':
                                weatherData.weather_condition = "맑음";
                                break;
                            case '3':
                                weatherData.weather_condition = "구름많음";
                                break;
                            case '4':
                                weatherData.weather_condition = "흐림";
                                break;
                        }
                    }
                    break;
            }
        });
        
        res.status(200).json({
            success: true,
            data: weatherData
        });

    } catch (error) {
        console.error("날씨 정보 조회 중 오류 발생:", error);
        res.status(500).json({
            success: false,
            message: "날씨 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
        });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});