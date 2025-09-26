const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const tz = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(tz);

const ZONE = 'Asia/Seoul';

// 반영 지연 보정 (⏱ 2분 정도만 빼줌)
const GRACE_MINUTES = 2;
// 초단기 실황은 10분 간격
const STEP_MINUTES = 10;

// 10분 단위로 내림 + 지연 보정
function floorToStepKST(now = dayjs().tz(ZONE)) {
  const t = now.subtract(GRACE_MINUTES, 'minute');
  const m = t.minute();
  const floored = Math.floor(m / STEP_MINUTES) * STEP_MINUTES;
  return t.minute(floored).second(0).millisecond(0);
}

// 현재 기준 시각
function currentBaseKST() {
  const base = floorToStepKST();
  return {
    baseDate: base.format('YYYYMMDD'),
    baseTime: base.format('HHmm'), // ✅ HH00이 아니라 HHmm
    tz: ZONE,
    isoNow: dayjs().tz(ZONE).toISOString(),
  };
}

// 최근 N시간까지 fallback (10분 간격)
function* basesWithFallback(hoursBack = 3) {
  const start = floorToStepKST();
  const steps = Math.max(0, Math.floor((hoursBack * 60) / STEP_MINUTES));
  for (let i = 0; i <= steps; i++) {
    const b = start.subtract(i * STEP_MINUTES, 'minute');
    yield { baseDate: b.format('YYYYMMDD'), baseTime: b.format('HHmm') };
  }
}

module.exports = { currentBaseKST, basesWithFallback, ZONE, GRACE_MINUTES, STEP_MINUTES };
