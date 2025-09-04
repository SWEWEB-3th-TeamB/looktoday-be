const express = require('express');
const router = express.Router();
// ✅ 한글 키로 응답 주는 함수로 교체
const { getSunTimesKoBySiGungu } = require('../services/sunService');

/**
 * @swagger
 * tags:
 *   name: Sun
 *   description: 일출·일몰 조회 API
 */

/**
 * @swagger
 * /api/sun:
 *   get:
 *     summary: "일출·일몰 시각 조회 (시·군·구 기준)"
 *     description: "시/군구와 선택적 날짜(YYYY-MM-DD)를 입력하면 해당 위치의 일출·일몰 시각을 반환합니다. 날짜가 없으면 오늘로 조회합니다."
 *     tags: [Sun]
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
 *       - in: query
 *         name: date
 *         required: false
 *         schema: { type: string, format: date }
 *         description: "조회 날짜 (예: 2025-09-04)"
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
 *                 date: { type: string, example: "2025-09-04" }
 *                 sunrise: { type: string, example: "06:01" }
 *                 sunset:  { type: string, example: "19:43" }
 *       400:
 *         description: "잘못된 요청(시/군구 누락 등)"
 *       500:
 *         description: "서버 오류"
 */
router.get('/', (req, res) => {
  const { si, gungu, date } = req.query;
  if (!si || !gungu) {
    return res.status(400).json({ message: 'si, gungu는 필수입니다.' });
  }
  try {
    const data = getSunTimesKoBySiGungu({ si, gungu, date });
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

module.exports = router;
