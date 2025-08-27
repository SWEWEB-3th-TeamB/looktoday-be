// routes/weatherNow.js
const express = require('express');
const router = express.Router();
const db = require('../models');
const { UltraNowcast } = db;
const locationMap = require('../data/locationMap');

// --- 코드/라벨 매핑 ---
const PTY_LABEL = {
  '0': '강수 없음', '1': '비', '2': '비/눈', '3': '눈',
  '4': '소나기', '5': '빗방울', '6': '빗방울/눈날림', '7': '눈날림',
};
const LABELS = {
  T1H: { key: '기온', unit: '℃' },
  REH: { key: '습도', unit: '%' },
  PTY: { key: '강수형태', unit: '' },
  RN1: { key: '1시간강수량', unit: 'mm' },
  WSD: { key: '풍속', unit: 'm/s' },
  VEC: { key: '풍향', unit: '°' },
  UUU: { key: '동서바람성분', unit: 'm/s' },
  VVV: { key: '남북바람성분', unit: 'm/s' },
};

// 시/구 → nx,ny 찾기
function getNxNy(si, gungu) {
  const arr = locationMap[si];
  if (!arr) return null;
  return arr.find(d => d.district === gungu) || null;
}

// 현재 시각 기준 정시(HH00)
function currentBase() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const H = String(now.getHours()).padStart(2, '0');
  return { baseDate: `${y}${m}${d}`, baseTime: `${H}00` };
}

// baseDate만 바꾸지 않고 시간만 ±h 이동 (자정 넘어가면 날짜 보정)
function shift(baseDate, baseTime, hourOffset) {
  const y = Number(baseDate.slice(0, 4));
  const mo = Number(baseDate.slice(4, 6)) - 1;
  const da = Number(baseDate.slice(6, 8));
  const H = Number(baseTime.slice(0, 2));
  const dt = new Date(y, mo, da, H, 0, 0);
  dt.setHours(dt.getHours() + hourOffset);
  const Y = dt.getFullYear();
  const M = String(dt.getMonth() + 1).padStart(2, '0');
  const D = String(dt.getDate()).padStart(2, '0');
  const HH = String(dt.getHours()).padStart(2, '0');
  return { baseDate: `${Y}${M}${D}`, baseTime: `${HH}00` };
}

// 카테고리 배열 → 한글 요약/원시 맵
function buildPayload(items) {
  const byCat = {};
  for (const it of items) byCat[it.category] = String(it.obsrValue);

  const summary = {};
  for (const [cat, conf] of Object.entries(LABELS)) {
    if (byCat[cat] == null) continue;
    if (cat === 'PTY') {
      summary[conf.key] = PTY_LABEL[byCat.PTY] || `코드 ${byCat.PTY}`;
    } else {
      summary[conf.key] = conf.unit
        ? `${byCat[cat]}${conf.unit}`
        : byCat[cat];
    }
  }
  return { summary, raw: byCat };
}

// GET /api/weather/now?si=서울특별시&gungu=강남구
router.get('/now', async (req, res) => {
  try {
    const { si, gungu } = req.query;
    if (!si || !gungu) {
      return res.status(400).json({ message: 'si(시·도)와 gungu(구·군)을 쿼리로 주세요.' });
    }

    const loc = getNxNy(si, gungu);
    if (!loc) {
      return res.status(404).json({ message: `좌표를 찾을 수 없습니다: ${si} ${gungu}` });
    }
    const { nx, ny } = loc;

    // 현재 정시 → 없으면 -1h → -2h 폴백
    const nowBase = currentBase();
    const candidates = [
      nowBase,
      shift(nowBase.baseDate, nowBase.baseTime, -1),
      shift(nowBase.baseDate, nowBase.baseTime, -2),
    ];

    let chosen = null;
    let rows = null;

    for (const c of candidates) {
      const found = await UltraNowcast.findAll({
        where: { baseDate: c.baseDate, baseTime: c.baseTime, nx, ny },
        order: [['category', 'ASC']],
      });
      if (found?.length) {
        chosen = c;
        rows = found.map(r => ({
          category: r.category,
          obsrValue: r.obsrValue,
        }));
        break;
      }
    }

    if (!rows) {
      // 아직 수집 전
      return res.status(204).json(); // No Content
    }

    const { summary, raw } = buildPayload(rows);

    return res.json({
      si,
      gungu,
      nx,
      ny,
      baseDate: chosen.baseDate,
      baseTime: chosen.baseTime,
      weather: summary,        // ✅ 한글/단위 포함 요약
      raw,                     // (옵션) 카테고리 원시값
    });
  } catch (err) {
    console.error('[weather/now] error', err);
    res.status(500).json({ message: '서버 오류', detail: err.message });
  }
});

module.exports = router;