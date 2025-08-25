const cron = require('node-cron');
const weatherService = require('./weatherService');
const weatherSaver = require('./weatherSaver');
const locationMap = require('../data/locationMap'); // ★ 전국 좌표 불러오기

// locationMap에서 lat, lon 추출해서 1차원 배열 만들기
function getAllLocations() {
  const locations = [];
  for (const city in locationMap) {
    const districts = locationMap[city];
    for (const d of districts) {
      locations.push({
        lat: d.lat,
        lon: d.lon,
        city: city,
        district: d.district,
        nx: d.nx,
        ny: d.ny,
      });
    }
  }
  return locations;
}

// 한 좌표 처리
async function runOnceFor(loc) {
  try {
    const { lat, lon, city, district } = loc;
    const wx = await weatherService.getWeatherByCoordinates(lat, lon, { city, district });
    await weatherSaver.saveSnapshot(wx);
    console.log(`[weatherCron] saved: ${city} ${district || ''} ${lat},${lon}`);
  } catch (e) {
    console.error(`[weatherCron] error (${loc.city} ${loc.district}):`, e.message);
  }
}

// 전체 처리
async function runAll() {
  const locations = getAllLocations();
  console.log(`[weatherCron] ${locations.length}개 지역 날씨 수집 시작`);

  // 병렬 호출 가능하지만 기상청 API 호출 한도(1만 회/일) 고려해서 순차 실행 권장
  for (const loc of locations) {
    await runOnceFor(loc);
  }

  console.log(`[weatherCron] ${locations.length}개 지역 날씨 수집 완료`);
}

exports.start = () => {
  if (process.env.WEATHER_CRON !== 'on') {
    console.log('[weatherCron] disabled');
    return;
  }

  // 매 정각마다 실행
  cron.schedule('0 * * * *', runAll, { timezone: 'Asia/Seoul' });

  console.log('[weatherCron] scheduled: every hour at minute 0 (Asia/Seoul)');

};
