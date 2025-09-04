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

// baseDate/time 시간만 ±h 이동
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
  const HH = String(dt.getHours() + 0).padStart(2, '0');
  return { baseDate: `${Y}${M}${D}`, baseTime: `${HH}00` };
}

// row(가로형 1행) -> [{ category, obsrValue }] 배열로 변환
function rowToItems(row) {
  const items = [];
  if (row.tmp != null) items.push({ category: 'T1H', obsrValue: row.tmp });
  if (row.reh != null) items.push({ category: 'REH', obsrValue: row.reh });
  if (row.wsd != null) items.push({ category: 'WSD', obsrValue: row.wsd });
  if (row.vec != null) items.push({ category: 'VEC', obsrValue: row.vec });
  if (row.uuu != null) items.push({ category: 'UUU', obsrValue: row.uuu });
  if (row.vvv != null) items.push({ category: 'VVV', obsrValue: row.vvv });
  if (row.pty != null) items.push({ category: 'PTY', obsrValue: row.pty });
  if (row.pcp != null) items.push({ category: 'RN1', obsrValue: row.pcp });
  if (row.lgt != null) items.push({ category: 'LGT', obsrValue: row.lgt });
  return items;
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
      summary[conf.key] = conf.unit ? `${byCat[cat]}${conf.unit}` : byCat[cat];
    }
  }
  return { summary, raw: byCat };
}

/**
 * @swagger
 * tags:
 *   name: WeatherNow
 *   description: 초단기 실황 NOW 조회 API
 */

/**
 * @swagger
 * /api/weather/now:
 *   get:
 *     summary: "초단기 실황 NOW 조회 (시·군·구 기준)"
 *     description: "현재 정시 기준으로, 없으면 -1h/-2h 순으로 폴백하여 가장 최근 관측값을 반환합니다."
 *     tags: [WeatherNow]
 *     parameters:
 *       - in: query
 *         name: si
 *         required: true
 *         schema: { type: string }
 *         description: "시/도 (예: 서울특별시)"
 *       - in: query
 *         name: gungu
 *         required: true
 *         schema: { type: string }
 *         description: "군/구 (예: 노원구)"
 *     responses:
 *       200:
 *         description: "조회 성공"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 si: { type: string, example: "서울특별시" }
 *                 gungu: { type: string, example: "노원구" }
 *                 nx: { type: integer, example: 61 }
 *                 ny: { type: integer, example: 127 }
 *                 baseDate: { type: string, example: "20250828" }
 *                 baseTime: { type: string, example: "1300" }
 *                 weather:
 *                   type: object
 *                   properties:
 *                     기온: { type: string, example: "28℃" }
 *                     습도: { type: string, example: "65%" }
 *                     풍속: { type: string, example: "1.3m/s" }
 *                     풍향: { type: string, example: "304°" }
 *                     강수형태: { type: string, example: "강수 없음" }
 *                 raw:
 *                   type: object
 *                   properties:
 *                     T1H: { type: string, example: "28.0" }
 *                     REH: { type: string, example: "65" }
 *                     WSD: { type: string, example: "1.3" }
 *                     VEC: { type: string, example: "304" }
 *                     UUU: { type: string, example: "0.3" }
 *                     VVV: { type: string, example: "-0.2" }
 *                     PTY: { type: string, example: "0" }
 *       204:
 *         description: "콘텐츠 없음 (해당 시각 데이터 미존재)"
 *       400:
 *         description: "잘못된 요청(시/군구 누락 등)"
 *       404:
 *         description: "좌표(nx, ny) 미발견"
 *       500:
 *         description: "서버 오류"
 */
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
      const found = await UltraNowcast.findOne({
        where: { baseDate: c.baseDate, baseTime: c.baseTime, nx, ny },
      });
      if (found) {
        chosen = c;
        rows = rowToItems(found);   // ← 1행을 카테고리 배열로 변환
        break;
      }
    }

    if (!rows) {
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
      weather: summary,  // 한글/단위 포함 요약
      raw,               // 원시 카테고리 맵(옵션)
    });
  } catch (err) {
    console.error('[weather/now] error', err);
    res.status(500).json({ message: '서버 오류', detail: err.message });
  }
});

module.exports = router;
