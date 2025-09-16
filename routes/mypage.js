const express = require('express');
const router = express.Router();
const { authMiddleware, isLoggedIn, isNotLoggedIn } = require('../middlewares/authMiddleware');
const mypageController = require('../controllers/mypageControllers');
const authController = require('../controllers/authControllers');
const db = require('../models');
const User = db.User;

/**
 * @swagger
 * tags:
 *   name: MyPage
 *   description: 마이페이지 관련 API
 */

// 이메일 중복 확인 (GET /api/auth/check-email)
router.get('/check-email', authController.checkEmail);

// 닉네임 중복 확인 (GET /api/auth/check-username)
router.get('/check-username', authController.checkNickname);



// 내 프로필 수정
/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: "프로필 수정 (이메일, 비밀번호, 닉네임, 생일, 지역)"
 *     tags: [MyPage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "newemail@example.com"
 *               currentPassword:
 *                 type: string
 *                 example: "oldPassword123!"
 *               newPassword:
 *                 type: string
 *                 example: "NewPassword123!"
 *               confirmPassword:
 *                 type: string
 *                 example: "NewPassword123!"
 *               nickname:
 *                 type: string
 *                 example: "새닉네임"
 *               birth:
 *                 type: string
 *                 example: "1999-05-20"
 *               si:
 *                 type: string
 *                 example: "서울시"
 *               gungu:
 *                 type: string
 *                 example: "강남구"
 *     responses:
 *       200:
 *         description: "프로필 수정 성공"
 *         content:
 *           application/json:
 *             example:
 *               code: "USER200"
 *               message: "프로필이 성공적으로 수정되었습니다."
 *               result:
 *                 user_id: 1
 *                 email: "newemail@example.com"
 *                 nickname: "새닉네임"
 *                 birth: "1999-05-20"
 *                 si: "서울시"
 *                 gungu: "강남구"
 *       400:
 *         description: "잘못된 요청"
 *       404:
 *         description: "사용자 없음"
 *       409:
 *         description: "중복된 이메일 또는 닉네임"
 *       500:
 *         description: "서버 오류"
 */
router.put('/me', isLoggedIn, mypageController.updateProfile);

// 내 피드(내가 올린 게시글) 조회 + 기간/월/날짜범위 필터 + 페이징
/**
 * @swagger
 * /api/users/me/feeds:
 *   get:
 *     summary: "내가 작성한 피드 조회"
 *     tags: [MyPage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [12m, last-month, this-month]
 *         description: "기간 필터"
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           example: "2025-01-01"
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           example: "2025-09-01"
 *     responses:
 *       200:
 *         description: "내 피드 조회 성공"
 *         content:
 *           application/json:
 *             example:
 *               code: "FEED200"
 *               message: "내 피드 조회에 성공했습니다."
 *               result:
 *                 filter:
 *                   type: "period"
 *                   value: "12m"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   totalPosts: 25
 *                   totalPages: 3
 *                 myLooks:
 *                   - looktoday_id: 123
 *                     imageUrl: "https://example.com/image.jpg"
 *                     sido: "서울시"
 *                     gungu: "강남구"
 *                     apparent_temp: "23도"
 *                     apparent_humidity: "70%"
 *                     likeCount: 5
 *                     isLiked: true
 *                     createdAt: "2025-09-07T12:34:56Z"
 *                     userNickname: "닉네임"
 *       401:
 *         description: "인증 실패"
 *       500:
 *         description: "서버 오류"
 */
router.get('/me/feeds',isLoggedIn, mypageController.getMyFeeds);

// 내 좋아요한 게시글 목록
/**
 * @swagger
 * /api/users/me/likes:
 *   get:
 *     summary: "내가 좋아요한 게시글 조회"
 *     tags: [MyPage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [12m, last-month, this-month]
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "내 좋아요한 게시글 조회 성공"
 *         content:
 *           application/json:
 *             example:
 *               code: "LIKE200"
 *               message: "내가 좋아요 한 게시물 목록 조회에 성공했습니다."
 *               result:
 *                 filter:
 *                   type: "period"
 *                   value: "12m"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   totalPosts: 12
 *                   totalPages: 2
 *                 myLikes:
 *                   - looktoday_id: 456
 *                     imageUrl: "https://example.com/image2.jpg"
 *                     sido: "서울시"
 *                     gungu: "마포구"
 *                     weather: "25도"
 *                     likeCount: 7
 *                     isLiked: true
 *       401:
 *         description: "인증 실패"
 *       500:
 *         description: "서버 오류"
 */

router.get('/me/likes',isLoggedIn, mypageController.getMyLikes);




module.exports = router;
