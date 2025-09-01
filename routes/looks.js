const express = require('express');
const router = express.Router();

const looksControllers = require('../controllers/looksControllers.js');
const { authMiddleware } = require('../middlewares/authMiddleware.js');

/**
 * @swagger
 * tags:
 *   - name: Looks
 *     description: 게시물(룩) 관련 API
 */

// GET /api/looks - 게시물 목록 조회
/**
 * @swagger
 * /api/looks:
 *   get:
 *     summary: 룩 목록 조회 (필터링/정렬/페이지네이션)
 *     tags:
 *       - Looks
 *     parameters:
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [latest, popular]
 *         description: 정렬 기준 (기본값: latest)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 한 페이지에 보여줄 게시물 수
 *       - in: query
 *         name: sido
 *         schema:
 *           type: string
 *         description: 시/도 필터링 (예: 서울시)
 *       - in: query
 *         name: gungu
 *         schema:
 *           type: string
 *         description: 군/구 필터링 (예: 노원구)
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: 날짜 필터링 (YYYY-MM-DD)
 *       - in: query
 *         name: weather
 *         schema:
 *           type: string
 *         description: 날씨 필터링 (예: 6 ~ 11°C, custom)
 *       - in: query
 *         name: minTemp
 *         schema:
 *           type: integer
 *         description: 직접입력 최소 온도 (weather=custom 일 때 사용)
 *       - in: query
 *         name: maxTemp
 *         schema:
 *           type: integer
 *         description: 직접입력 최대 온도 (weather=custom 일 때 사용)
 *     responses:
 *       200:
 *         description: 룩 목록 조회 성공
 *       500:
 *         description: 서버 오류
 */
router.get('/', looksControllers.getLooks);

// GET /api/looks/best - BEST 10 룩 조회
/**
 * @swagger
 * /api/looks/best:
 *   get:
 *     summary: BEST 10 룩 조회
 *     tags:
 *       - Looks
 *     responses:
 *       200:
 *         description: BEST 10 게시물 조회 성공
 *       500:
 *         description: 서버 오류
 */
router.get('/best', looksControllers.getBestLooks);

// GET /api/looks/{looktoday_id} - 게시물 상세 조회
/**
 * @swagger
 * /api/looks/{looktoday_id}:
 *   get:
 *     summary: 게시물 상세 조회
 *     tags:
 *       - Looks
 *     parameters:
 *       - in: path
 *         name: looktoday_id
 *         required: true
 *         description: 조회할 게시물의 ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 게시물 상세 조회 성공
 *       404:
 *         description: 해당 게시물을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:looktoday_id', looksControllers.getLookDetail);

// POST /api/looks/{looktoday_id}/like - 게시물 좋아요
/**
 * @swagger
 * /api/looks/{looktoday_id}/like:
 *   post:
 *     summary: 게시물 좋아요
 *     tags:
 *       - Looks
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: looktoday_id
 *         required: true
 *         description: 좋아요 할 게시물의 ID
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: 좋아요 처리 완료
 *       401:
 *         description: 인증 실패
 *       409:
 *         description: 이미 좋아요를 누른 게시물
 */
router.post('/:looktoday_id/like', authMiddleware, looksControllers.likePost);

// DELETE /api/looks/{looktoday_id}/like - 게시물 좋아요 취소
/**
 * @swagger
 * /api/looks/{looktoday_id}/like:
 *   delete:
 *     summary: 게시물 좋아요 취소
 *     tags:
 *       - Looks
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: looktoday_id
 *         required: true
 *         description: 좋아요를 취소할 게시물의 ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 좋아요 취소 완료
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 좋아요 기록을 찾을 수 없음
 */
router.delete('/:looktoday_id/like', authMiddleware, looksControllers.unlikePost);

module.exports = router;