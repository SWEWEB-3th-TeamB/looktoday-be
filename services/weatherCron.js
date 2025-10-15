// services/weatherCron.js
const cron = require('node-cron');
const locationMap = require('../data/locationMap');
const { ZONE } = require('../utils/time');

// ★ 최신 폴백 수집 함수로 교체 (옛날 fetchAndSaveUltraNowcastByXY 사용 금지)
const { fetchUltraNowcastWithFallback } = require('./ultraNowcastService');

function log(...args) {
  console.log('[weatherCron]', ...args);
}

function getAllLocations() {
  const list = [];
  for (const si of Object.keys(locationMap)) {
    for (const d of locationMap[si]) {
      list.push({ si, gungu: d.district ?? '', nx: d.nx, ny: d.ny });
    }
  }
  return list;
}

// 좌표 1건 수집 (10분 단위로 최대 1시간 롤백)
async function collectOne({ nx, ny, si, gungu }) {
  try {
    const r = await fetchUltraNowcastWithFallback({ nx, ny, si, gungu, hoursBack: 1 });
    if (r) {
      log(`✅ upsert: ${si} ${gungu} (${nx},${ny}) @ ${r.baseDate} ${r.baseTime}`);
      return true;
    }
    log(`⚠️ no data: ${si} ${gungu} (${nx},${ny})`);
    return false;
  } catch (e) {
    log(`❌ collect error: ${si} ${gungu} (${nx},${ny}) → ${e?.message}`);
    return false;
  }
}

// 전체 지역 1회 수집
async function runOnce() {
  const all = getAllLocations();
  log(`부팅/주기 1회 수집 시작: ${all.length}개 지역`);
  let ok = 0;
  for (const loc of all) {
    const done = await collectOne(loc);
    if (done) ok++;
  }
  log(`1회 수집 종료: ${ok}/${all.length} 지역 upsert`);
}

// 스케줄 시작
let job = null;
function start() {
  const CRON = process.env.WEATHER_CRON;
  const BOOT = process.env.WEATHER_CRON_BOOTSTRAP;
  log(`env: WEATHER_CRON=${CRON}, WEATHER_CRON_BOOTSTRAP=${BOOT}, TZ=${ZONE}`);

  if (CRON !== 'on') {
    log('disabled');
    return;
  }

  // 매 10분마다 실행
  job = cron.schedule('*/10 * * * *', () => {
    runOnce().catch(e => log('주기 수집 에러:', e?.message));
  }, { timezone: ZONE });

  // 부팅 즉시 1회 실행 (옵션)
  if (BOOT === 'on') {
    log('서버 부팅 시 1회 수집 실행');
    runOnce().catch(e => log('부팅 1회 수집 에러:', e?.message));
  }

  log('scheduled: 10분 간격');
}

function stop() {
  job?.stop();
  job = null;
}

module.exports = { start, stop, runOnce };
