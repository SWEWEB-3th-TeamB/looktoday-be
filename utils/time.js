const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const tz = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(tz);

const ZONE = 'Asia/Seoul';

// 반영 지연 보정 (예: 2분)
const GRACE_MINUTES = 2;
// 초단기실황은 10분 간격(HH00,10,20,30,40,50)
const STEP_MINUTES = 10;

// 10분 단위로 내림 + 지연 보정
function floorToStepKST(now = dayjs().tz(ZONE)) {
  const t = now.subtract(GRACE_MINUTES, 'minute');
  const flooredMin = Math.floor(t.minute() / STEP_MINUTES) * STEP_MINUTES;
  return t.minute(flooredMin).second(0).millisecond(0);
}

// 현재 기준 슬롯 (요청/DB 저장 둘 다 이 값만 사용)
function currentBaseKST() {
  const base = floorToStepKST();
  return {
    baseDate: base.format('YYYYMMDD'),
    baseTime: base.format('HHmm'), // 반드시 HHmm 유지
    tz: ZONE,
    isoNow: dayjs().tz(ZONE).toISOString(),
  };
}

// 직전 슬롯 (폴백/재시도에 사용)
function prevSlot(baseDate, baseTime, step = STEP_MINUTES) {
  const t = dayjs.tz(`${baseDate}${baseTime}`, 'YYYYMMDDHHmm', ZONE).subtract(step, 'minute');
  return { baseDate: t.format('YYYYMMDD'), baseTime: t.format('HHmm') };
}

// 최근 N시간까지 fallback(10분 간격)
function* basesWithFallback(hoursBack = 3) {
  const start = floorToStepKST();
  const steps = Math.max(0, Math.floor((hoursBack * 60) / STEP_MINUTES));
  for (let i = 0; i <= steps; i++) {
    const b = start.subtract(i * STEP_MINUTES, 'minute');
    yield { baseDate: b.format('YYYYMMDD'), baseTime: b.format('HHmm') };
  }
}

// 디버깅 보조: 두 슬롯 동일성 체크
function slotEquals(a, b) {
  return a.baseDate === b.baseDate && a.baseTime === b.baseTime;
}

module.exports = {
  ZONE,
  GRACE_MINUTES,
  STEP_MINUTES,
  floorToStepKST,
  currentBaseKST,
  prevSlot,
  basesWithFallback,
  slotEquals,
};
