const express = require('express');
const router = express.Router();

const looksControllers = require('../controllers/looksControllers.js');

const { authMiddleware } = require('../middlewares/authMiddleware.js');

/**
 * @swagger
 * tags:
 * name: Looks
 * description: 게시물(룩) 관련 API
 */

// GET /api/looks - 게시물(룩) 목록 조회
/**
 * @swagger
 * /api/looks:
 * get:
 * summary: "룩 목록 조회 (필터링/정렬/페이지네이션)"
 * tags: [Looks]
 * parameters:
 * - in: query
 * name: sort
 * schema:
 * type: string
 * enum: [latest, popular]
 * description: "정렬 기준 (기본값: latest)"
 * - in: query
 * name: page
 * schema:
 * type: integer
 * default: 1
 * description: "페이지 번호"
 * - in: query
 * name: limit
 * schema:
 * type: integer
 * default: 20
 * description: "한 페이지에 보여줄 게시물 수"
 * - in: query
 * name: sido
 * schema:
 * type: string
 * description: "시/도 필터링 (예: 서울특별시)"
 * - in: query
 * name: gungu
 * schema:
 * type: string
 * description: "군/구 필터링 (예: 강남구)"
 * - in: query
 * name: date
 * schema:
 * type: string
 * format: date
 * description: "날짜 필터링 (YYYY-MM-DD)"
 * - in: query
 * name: weather
 * schema:
 * type: string
 * description: "날씨 필터링 (예: 6 ~ 11°C, custom)"
 * - in: query
 * name: minTemp
 * schema:
 * type: integer
 * description: "직접입력 최소 온도 (weather=custom 일 때 사용)"
 * - in: query
 * name: maxTemp
 * schema:
 * type: integer
 * description: "직접입력 최대 온도 (weather=custom 일 때 사용)"
 * responses:
 * "200":
 * description: "룩 목록 조회 성공"
 * "500":
 * description: "서버 오류"
 */
router.get('/', looksControllers.getLooks);

// GET /api/looks/best - BEST 10 룩 조회
router.get('/best', looksControllers.getBestLooks);

//GET /api/(/api/looks/:lookId) - 게시물 상세 조회
router.get('/:looktoday_id', looksControllers.getLookDetail);

// POST /api/looks/:lookId/like - 게시물 좋아요
router.post('/:looktoday_id/like', authMiddleware, looksControllers.likePost);

// DELETE /api/looks/:lookId/like - 게시물 좋아요 취소
router.delete('/:looktoday_id/like', authMiddleware, looksControllers.unlikePost);

module.exports = router;