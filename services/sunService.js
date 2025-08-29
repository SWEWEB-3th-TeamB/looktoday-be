const SunCalc = require('suncalc');
const locationMap = require('../data/locationMap');

// 시/군구 → 위경도
function findLatLon(si, gungu) {
  const list = locationMap[si];
  if (!list) return null;
  const norm = (s) => String(s || '').replace(/\s+/g, '');
  const hit =
    list.find(d => norm(d.district) === norm(gungu)) ||
    list.find(d => norm(gungu).includes(norm(d.district)));
  if (!hit) return null;
  return { lat: hit.lat, lon: hit.lon };
}

// UTC Date → KST HH:mm
function toKST(date) {
  if (!date) return null;
  const fmt = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  });
  return fmt.format(date);
}

// 'YYYYMMDD' → 해당 날짜의 정오(UTC) Date
function parseDate(yyyymmdd) {
  if (!yyyymmdd) return new Date();
  const y = +yyyymmdd.slice(0, 4);
  const m = +yyyymmdd.slice(4, 6) - 1;
  const d = +yyyymmdd.slice(6, 8);
  return new Date(Date.UTC(y, m, d, 12, 0, 0));
}

// 기본(영문 키) 버전 — 필요시 다른 곳에서도 재사용 가능
function getSunTimesBySiGungu({ si, gungu, date }) {
  const ll = findLatLon(si, gungu);
  if (!ll) throw new Error(`좌표를 찾을 수 없습니다: ${si} ${gungu}`);

  const day = parseDate(date);
  const times = SunCalc.getTimes(day, ll.lat, ll.lon);

  const yyyymmdd =
    date ||
    new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(day)
      .replace(/\D/g, '');

  return {
    si,
    gungu,
    lat: ll.lat,
    lon: ll.lon,
    date: yyyymmdd,
    sunrise: toKST(times.sunrise),
    sunset: toKST(times.sunset),
    dawn: toKST(times.dawn), // 시민박명 시작
    dusk: toKST(times.dusk), // 시민박명 끝
    // suncalc: goldenHourEnd(일출 후), goldenHour(일몰 전)
    goldenStart: toKST(times.goldenHourEnd),
    goldenEnd: toKST(times.goldenHour),
    solarNoon: toKST(times.solarNoon),
  };
}

// ✅ 한글 키로 리네이밍한 버전 (라우트에서 이걸 사용)
function getSunTimesKoBySiGungu(opts) {
  const data = getSunTimesBySiGungu(opts);
  return {
    시: data.si,
    군구: data.gungu,
    위도: data.lat,
    경도: data.lon,
    날짜: data.date,
    일출: data.sunrise,
    일몰: data.sunset,
    '박명(아침)': data.dawn,
    '박명(저녁)': data.dusk,
    '골든아워 시작': data.goldenStart,
    '골든아워 종료': data.goldenEnd,
    남중: data.solarNoon,
  };
}

module.exports = {
  getSunTimesBySiGungu,   // (영문 키) 기존과 호환용
  getSunTimesKoBySiGungu, // (한글 키) 라우트에서 사용
};