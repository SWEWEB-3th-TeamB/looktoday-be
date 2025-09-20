// utils/time.js
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const tz = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(tz);

const ZONE = 'Asia/Seoul';

// 현재 KST '정시' 기준 baseDate/baseTime
function currentBaseKST() {
  const base = dayjs().tz(ZONE).startOf('hour');
  return {
    baseDate: base.format('YYYYMMDD'),
    baseTime: base.format('HH00'),
    tz: ZONE,
    isoNow: dayjs().tz(ZONE).toISOString(), // 디버그용
  };
}

// 최근 N시간까지 KST 기준으로 롤백 (조회 fallback용)
function* basesWithFallback(hoursBack = 3) {
  const start = dayjs().tz(ZONE).startOf('hour');
  for (let i = 0; i <= hoursBack; i++) {
    const b = start.subtract(i, 'hour');
    yield { baseDate: b.format('YYYYMMDD'), baseTime: b.format('HH00') };
  }
}

module.exports = { currentBaseKST, basesWithFallback, ZONE };
