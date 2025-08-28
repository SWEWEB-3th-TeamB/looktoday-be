// services/sunService.js
const SunCalc = require('suncalc');
const locationMap = require('../data/locationMap');

function findLatLon(si, gungu) {
  const list = locationMap[si];
  if (!list) return null;
  const hit = list.find(d => d.district.replace(/\s+/g, '') === String(gungu).replace(/\s+/g, ''));
  if (!hit) return null;
  return { lat: hit.lat, lon: hit.lon };
}

function toKST(date) {
  // date(UTC기반 JS Date)를 Asia/Seoul 로컬시간 HH:mm로 포맷
  const fmt = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul'
  });
  return fmt.format(date);
}

function parseDate(yyyymmdd) {
  if (!yyyymmdd) return new Date();
  const y = +yyyymmdd.slice(0,4);
  const m = +yyyymmdd.slice(4,6) - 1;
  const d = +yyyymmdd.slice(6,8);
  return new Date(Date.UTC(y, m, d, 12, 0, 0)); // 정오 기준으로 날짜 고정
}

/**
 * 일출/일몰 등 태양 이벤트 계산
 * @param {object} opts
 * @param {string} opts.si      예: '서울특별시'
 * @param {string} opts.gungu   예: '강남구'
 * @param {string} [opts.date]  'YYYYMMDD' (없으면 오늘)
 */
function getSunTimesBySiGungu({ si, gungu, date }) {
  const ll = findLatLon(si, gungu);
  if (!ll) throw new Error(`좌표를 찾을 수 없습니다: ${si} ${gungu}`);
  const day = parseDate(date);
  const times = SunCalc.getTimes(day, ll.lat, ll.lon); // 반환은 UTC Date

  return {
    si, gungu, lat: ll.lat, lon: ll.lon, date: date || new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit' }).format(day).replace(/\D/g,''),
    sunrise:     toKST(times.sunrise),
    sunset:      toKST(times.sunset),
    dawn:        toKST(times.dawn),        // 시민박명 시작
    dusk:        toKST(times.dusk),        // 시민박명 끝
    goldenStart: toKST(times.goldenHourEnd),   // 오전 골든아워 시작~끝 순서가 라이브러리 기준으로 반대라 주의
    goldenEnd:   toKST(times.goldenHour),
    solarNoon:   toKST(times.solarNoon),
  };
}

module.exports = { getSunTimesBySiGungu };
