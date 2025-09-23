// utils/time.js
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const tz = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(tz);

const ZONE = 'Asia/Seoul';

// 실황 수집/반영 지연 보정 (권장 15~20분)
const GRACE_MINUTES = 20;

// 타임스텝 간격 (초단기실황은 보통 10분 간격)
const STEP_MINUTES = 10;

/** now(KST)에서 GRACE_MINUTES만큼 빼고, STEP_MINUTES 단위로 내림 */
function floorToStepKST(now = dayjs().tz(ZONE)) {
  const t = now.subtract(GRACE_MINUTES, 'minute');
  const m = t.minute();
  const floored = Math.floor(m / STEP_MINUTES) * STEP_MINUTES;
  return t.minute(floored).second(0).millisecond(0);
}

/** 현재 KST 기준 가용 base (HHmm) */
function currentBaseKST() {
  const base = floorToStepKST();
  return {
    baseDate: base.format('YYYYMMDD'),
    baseTime: base.format('HHmm'),
    tz: ZONE,
    isoNow: dayjs().tz(ZONE).toISOString(), // 디버깅용
  };
}

/**
 * 최근 N시간까지 KST 기준으로 fallback (STEP_MINUTES 간격)
 * 기존 시그니처 유지: basesWithFallback(3) → 3시간 범위
 */
function* basesWithFallback(hoursBack = 3) {
  const start = floorToStepKST(); // 예: HH10, HH20, ... 로 떨어짐
  const steps = Math.max(0, Math.floor((hoursBack * 60) / STEP_MINUTES));
  for (let i = 0; i <= steps; i++) {
    const b = start.subtract(i * STEP_MINUTES, 'minute');
    yield { baseDate: b.format('YYYYMMDD'), baseTime: b.format('HHmm') };
  }
}

module.exports = { currentBaseKST, basesWithFallback, ZONE, GRACE_MINUTES, STEP_MINUTES };
