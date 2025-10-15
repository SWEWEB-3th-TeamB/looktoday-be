const express = require('express');
const router = express.Router();
const db = require('../models');
const { UltraNowcast } = db;
const locationMap = require('../data/locationMap');

// 공통 유틸: 최근 N시간, 10분 단위 fallback
const { basesWithFallback } = require('../utils/time');

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

// row(가로형 1행) → [{ category, obsrValue }] 배열로 변환
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
 *   description: 초단기 실황 NOW 조회 API (10분 단위 폴백 지원)
 */

/**
 * @swagger
 * /api/weather/now:
 *   get:
 *     summary: "초단기 실황 NOW 조회 (시·군·구 기준)"
 *     description: "가장 최근 10분 단위 기준시각부터 과거로 최대 3시간까지 폴백하여 가장 최근 관측값을 반환합니다."
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
    if (!loc) return res.status(404).json({ message: `좌표를 찾을 수 없습니다: ${si} ${gungu}` });

    const { nx, ny } = loc;

    // ✅ 최근 3시간, 10분 단위로 DB 조회
    let chosen = null;
    let rows = null;

    for (const { baseDate, baseTime } of basesWithFallback(3)) {
      const found = await UltraNowcast.findOne({
        where: { baseDate, baseTime, nx, ny },
      });
      if (found) {
        chosen = { baseDate, baseTime };
        rows = rowToItems(found);
        break;
      }
    }

    if (!rows) return res.status(204).send();

    const { summary, raw } = buildPayload(rows);
    return res.json({
      si, gungu, nx, ny,
      baseDate: chosen.baseDate,
      baseTime: chosen.baseTime,
      weather: summary,
      raw,
    });
  } catch (err) {
    console.error('[weather/now] error', err);
    res.status(500).json({ message: '서버 오류', detail: err.message });
  }
});

module.exports = router;
