// utils/ultraTime.js
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const tz = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(tz);

const ZONE = 'Asia/Seoul';

// 크론/수집 시각(now)을 KST 정시로 맞춰 baseDate/baseTime 생성
function getBaseDateTimeForUltra(now = new Date()) {
  const base = dayjs(now).tz(ZONE).startOf('hour');
  return {
    baseDate: base.format('YYYYMMDD'),
    baseTime: base.format('HH00'),
    tz: ZONE,
  };
}

module.exports = { getBaseDateTimeForUltra };