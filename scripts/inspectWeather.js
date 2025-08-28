'use strict';

require('dotenv').config();
const db = require('../models');
const { Weather } = db;

const SKY_MAP = { '1': '맑음', '3': '구름 많음', '4': '흐림' };
const PTY_MAP = {
  '0': '없음', '1': '비', '2': '비/눈', '3': '눈', '4': '소나기',
  '5': '빗방울', '6': '빗방울/눈날림', '7': '눈날림'
};

function getArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx > -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

// 현재 시간을 기준으로 fcstTime(예보 시간) 자동 선택
function getCurrentFcstTime() {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedHour = minutes >= 45 ? now.getHours() + 1 : now.getHours(); // 45분 넘으면 다음 시간으로
  const hh = String(roundedHour % 24).padStart(2, '0'); // 24시 되면 00시로 처리
  return {
    hhmm: hh + '00',       // 예: "2200"
    timeStr: hh + ':00:00' // 예: "22:00:00"
  };
}

(async () => {
  const si    = getArg('si',    '서울특별시');
  const gungu = getArg('gungu', '강남구');
  const date  = getArg('date',  new Date().toISOString().slice(0, 10)); // YYYY-MM-DD

  const { hhmm, timeStr } = getCurrentFcstTime();

  try {
    await db.sequelize.authenticate();

    // DB에서 해당 시각의 레코드 찾기
    const row = await Weather.findOne({ where: { si, gungu, date, time: timeStr } });
    if (!row) {
      console.log('❌ 데이터 없음:', si, gungu, date, timeStr);
      await db.sequelize.close();
      return;
    }

    const items = Array.isArray(row.weather_info) ? row.weather_info : [];
    console.log('\n✔ 레코드 찾음');
    console.table([{ si, gungu, date, time: timeStr, item_count: items.length }]);

    // 현재 정시(HH:00)에 해당하는 fcstTime만 필터
    const slot = items.filter(it => it.fcstTime === hhmm);

    if (slot.length === 0) {
      console.log('⚠️ ' + timeStr + '(' + hhmm + ') 예보값 없음 — 최신 예보를 기다리는 중일 수 있어요.');
      await db.sequelize.close();
      return;
    }

    // 요약 만들기
    const byCat = Object.fromEntries(slot.map(it => [it.category, it.fcstValue]));
    const summary = {
      '시각': timeStr,
      '기온': byCat.TMP ? byCat.TMP + '℃' : null,
      '습도': byCat.REH ? byCat.REH + '%' : null,
      '강수확률': byCat.POP ? byCat.POP + '%' : null,
      '강수량': byCat.PCP || null, // "강수없음" 또는 "1.0mm"
      '하늘상태': byCat.SKY ? (SKY_MAP[byCat.SKY] || ('코드 ' + byCat.SKY)) : null,
      '강수형태': byCat.PTY ? (PTY_MAP[byCat.PTY] || ('코드 ' + byCat.PTY)) : null,
      '풍속': byCat.WSD ? byCat.WSD + 'm/s' : null,
      '풍향(도)': byCat.VEC || null
    };

    console.log('\n— ' + timeStr + ' (' + si + ' ' + gungu + ') 날씨 요약 —');
    console.table([summary]);

    console.log('\n— 카테고리별 원자료 —');
    console.table(slot.map(({ category, fcstTime, fcstValue }) => ({ category, fcstTime, fcstValue })));

    await db.sequelize.close();
  } catch (err) {
    console.error('에러:', err.message);
    try { await db.sequelize.close(); } catch {}
    process.exit(1);
  }
})();
