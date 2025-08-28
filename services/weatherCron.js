const cron = require('node-cron');
const locationMap = require('../data/locationMap');
const { fetchAndSaveUltraNowcastByXY } = require('./ultraNowcastService');

// 전국 좌표 가져오기
function getAllLocations() {
  const locations = [];
  for (const city in locationMap) {
    const districts = locationMap[city];
    for (const d of districts) {
      locations.push({
        city,
        district: d.district,
        nx: d.nx,
        ny: d.ny,
      });
    }
  }
  return locations;
}

// 로그 함수
function log(...args) {
  console.log('[weatherCron]', ...args);
}

// 좌표별 1회 수집
async function runOnceForXY(loc, now) {
  try {
    const saved = await fetchAndSaveUltraNowcastByXY({ nx: loc.nx, ny: loc.ny, si: loc.city, gungu: loc.district, now });
    return saved;
  } catch (e) {
    log(`API 호출 실패: ${loc.city} ${loc.district} (${loc.nx},${loc.ny})`, e.message);
    return null;
  }
}

// 재시도 포함 처리
async function processLocationWithRetry(loc, now, maxRetries = 3) {
  let attempt = 1;
  let saved = await runOnceForXY(loc, now);

  // 최대 3회 재시도 (5분 간격)
  while (saved === null && attempt <= maxRetries) {
    const delay = 5 * 60 * 1000;
    log(`초단기실황 없음 → ${delay / 60000}분 뒤 재시도 예정 (${attempt}/${maxRetries}): ${loc.city} ${loc.district}`);
    await new Promise(resolve => setTimeout(resolve, delay));

    const retryNow = new Date();
    saved = await runOnceForXY(loc, retryNow);
    attempt++;
  }

  if (saved === null) {
    log(`❌ 데이터 수집 실패: ${loc.city} ${loc.district} (${loc.nx},${loc.ny})`);
  } else if (saved === 0) {
    log(`⚠️ 데이터 없음(0건): ${loc.city} ${loc.district} (${loc.nx},${loc.ny})`);
  } else {
    log(`✅ 저장 완료(${saved}건): ${loc.city} ${loc.district}`);
  }
}

// 전체 지역 수집 실행
async function runAll(now = new Date()) {
  const locations = getAllLocations();
  log(`${locations.length}개 지역 초단기실황 수집 시작 (기준: 매시정각, 호출시각: ${now.toISOString()})`);

  for (const loc of locations) {
    await processLocationWithRetry(loc, now, 2); // 기본 1차 + 최대 2회 재시도
  }

  log(`${locations.length}개 지역 초단기실황 수집 완료`);
}

// 크론 시작
exports.start = () => {
  if (process.env.WEATHER_CRON !== 'on') {
    log('disabled');
    return;
  }

  // 매시 10분마다 실행
  cron.schedule('10 * * * *', () => runAll(new Date()), {
    timezone: 'Asia/Seoul',
  });

  // 서버 켜질 때 즉시 한 번 실행 (옵션)
  if (process.env.WEATHER_CRON_BOOTSTRAP === 'on') {
    log('서버 부팅 시 1회 수집 실행');
    runAll(new Date());
  }

  log('scheduled: 매시 10분(Asia/Seoul), 실패 시 5분 간격으로 최대 2회 재시도');
};
