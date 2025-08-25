const axios = require('axios');

function yyyyMmDd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toLocalHM(isoUtc, timeZone = 'Asia/Seoul', locale = 'ko-KR') {
  const dt = new Date(isoUtc);
  return new Intl.DateTimeFormat(locale, {
    timeZone, hour12: false, hour: '2-digit', minute: '2-digit',
  }).format(dt);
}

async function getSunTimes(lat, lon, date = new Date()) {
  const url = 'https://api.sunrise-sunset.org/json';
  const params = { lat, lng: lon, date: yyyyMmDd(date), formatted: 0 };
  const { data } = await axios.get(url, { params, timeout: 8000 });
  if (!data || data.status !== 'OK') {
    const err = new Error(`Sunrise-Sunset API error: ${data?.status || 'FAILED'}`);
    err.code = 'SUN_API_ERROR';
    throw err;
  }
  const r = data.results;
  return {
    sunrise: toLocalHM(r.sunrise),
    sunset: toLocalHM(r.sunset),
    civilTwilightBegin: toLocalHM(r.civil_twilight_begin),
    civilTwilightEnd: toLocalHM(r.civil_twilight_end),
    source: 'sunrise-sunset.org',
  };
}

module.exports = { getSunTimes };
