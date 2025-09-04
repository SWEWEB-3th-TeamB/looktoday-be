const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');

/**
 * @swagger
 * tags:
 *   name: Weather
 *   description: 오늘의 날씨 조회 API
 */

/**
 * @swagger
 * /api/weather:
 *   get:
 *     summary: "오늘의 날씨 조회 (시·군·구 기준)"
 *     description: "시/군구를 기준으로 DB에 저장된 최신 초단기 실황을 반환합니다."
 *     tags: [Weather]
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
 *                   description: "원시 카테고리 맵"
 *                   properties:
 *                     T1H: { type: string, example: "28.0" }
 *                     REH: { type: string, example: "65" }
 *                     WSD: { type: string, example: "1.3" }
 *                     VEC: { type: string, example: "304" }
 *                     UUU: { type: string, example: "0.3" }
 *                     VVV: { type: string, example: "-0.2" }
 *                     PTY: { type: string, example: "0" }
 *       400:
 *         description: "잘못된 요청(시/군구 누락 등)"
 *       500:
 *         description: "서버 오류"
 */
router.get('/', weatherController.getWeather);

module.exports = router;
