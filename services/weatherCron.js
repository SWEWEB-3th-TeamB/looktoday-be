// services/weatherCron.js
const cron = require('node-cron');
const locationMap = require('../data/locationMap');
const { ZONE } = require('../utils/time');

// ★ 최신 폴백 수집 함수(유지)
const { fetchUltraNowcastWithFallback } = require('./ultraNowcastService');

function log(...args) {
  console.log('[weatherCron]', ...args);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Env 파라미터 */
const CONCURRENCY = Math.max(1, parseInt(process.env.WEATHER_CRON_CONCURRENCY || '6', 10)); // 동시 실행 개수
const TASK_DELAY_MS = Math.max(0, parseInt(process.env.WEATHER_CRON_TASK_DELAY_MS || '120', 10)); // 각 작업 후 간격
const START_JITTER_MS = Math.max(0, parseInt(process.env.WEATHER_CRON_START_JITTER_MS || '30', 10)); // 시작 지연 분산(작업 index 기준)
const JOB_SPREAD_BUCKET = Math.max(1, parseInt(process.env.WEATHER_CRON_SPREAD_BUCKET || '5', 10)); // 지연 분산 버킷

/** 좌표 대상(중복 제거) 목록 만들기 */
function getAllLocations() {
  const seen = new Set();
  const list = [];
  for (const si of Object.keys(locationMap)) {
    for (const d of locationMap[si]) {
      const nx = d.nx;
      const ny = d.ny;
      if (nx == null || ny == null) continue;
      const key = `${nx},${ny}`;
      if (seen.has(key)) continue; // (nx,ny) 단위 중복 제거
      seen.add(key);
      list.push({ si, gungu: d.district ?? '', nx, ny });
    }
  }
  return list;
}

/** 좌표 1건 수집 (10분 단위로 최대 1시간 롤백) */
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
    const code = e?.code || e?.response?.status || 'ERR';
    // 서비스에서 rate-limit/timeout 재시도 이미 함. 여기선 요약만.
    log(`❌ collect error: ${si} ${gungu} (${nx},${ny}) → ${code} ${e?.message || ''}`);
    return false;
  }
}

/** 간단한 동시성 풀 */
async function runWithConcurrency(jobs, concurrency) {
  let idx = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < jobs.length) {
      const my = idx++;
      await jobs[my]();
    }
  });
  await Promise.all(workers);
}

/** 전체 지역 1회 수집 (동시성 제한 + 시작 지터 + 작업 간 간격) */
async function runOnce() {
  const t0 = Date.now();
  const all = getAllLocations();
  log(`부팅/주기 1회 수집 시작: ${all.length}개 좌표 (CONCURRENCY=${CONCURRENCY}, DELAY=${TASK_DELAY_MS}ms, JITTER=${START_JITTER_MS}ms, BUCKET=${JOB_SPREAD_BUCKET})`);

  let ok = 0;
  const jobs = all.map((loc, i) => {
    return async () => {
      // 시작 지연 분산 (서버/슬롯 쏠림 완화)
      if (i) await sleep(START_JITTER_MS * (i % JOB_SPREAD_BUCKET));
      const done = await collectOne(loc);
      if (done) ok++;
      // 작업 간 짧은 간격(추가 완충)
      if (TASK_DELAY_MS) await sleep(TASK_DELAY_MS);
    };
  });

  await runWithConcurrency(jobs, CONCURRENCY);
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  log(`1회 수집 종료: ${ok}/${all.length} upsert, ${dt}s`);
}

/** 스케줄 시작 */
let job = null;
function start() {
  const CRON = process.env.WEATHER_CRON;
  const BOOT = process.env.WEATHER_CRON_BOOTSTRAP;
  log(`env: WEATHER_CRON=${CRON}, WEATHER_CRON_BOOTSTRAP=${BOOT}, TZ=${ZONE}, CONCURRENCY=${CONCURRENCY}`);

  if (CRON !== 'on') {
    log('disabled');
    return;
  }

  // 매 10분마다 실행
  job = cron.schedule(
    '*/10 * * * *',
    () => {
      runOnce().catch((e) => log('주기 수집 에러:', e?.message));
    },
    { timezone: ZONE }
  );

  // 부팅 즉시 1회 실행 (옵션)
  if (BOOT === 'on') {
    log('서버 부팅 시 1회 수집 실행');
    runOnce().catch((e) => log('부팅 1회 수집 에러:', e?.message));
  }

  log('scheduled: 10분 간격');
}

function stop() {
  job?.stop();
  job = null;
}

module.exports = { start, stop, runOnce };
