const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllers');

const { authMiddleware, isLoggedIn, isNotLoggedIn } = require('../middlewares/authMiddleware');
const db = require('../models');
const User = db.User;

const { ApiResponse } = require('../response');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: 유저 관련 API
 */

// 이메일 중복 확인 (GET /api/auth/check-email)
/**
 * @swagger
 * /api/auth/check-email:
 *   get:
 *     summary: "이메일 중복 확인"
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         required: true
 *         description: "확인할 이메일 주소"
 *     responses:
 *       200:
 *         description: "이메일 사용 가능 여부"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "AUTH200"
 *                 message:
 *                   type: string
 *                   example: "사용 가능한 이메일입니다."
 *                 result:
 *                   type: object
 *                   properties:
 *                     isAvailable:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: "유효하지 않은 이메일 형식"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "USER400"
 *                 message:
 *                   type: string
 *                   example: "유효하지 않은 이메일 형식입니다."
 *                 error:
 *                   type: object
 *                   example: {}
 *       500:
 *         description: "서버 오류"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "COMMON500"
 *                 message:
 *                   type: string
 *                   example: "서버 오류가 발생했습니다."
 *                 error:
 *                   type: object
 *                   example: {}
 */
router.get('/check-email', authController.checkEmail);

// 닉네임 중복 확인 (GET /api/auth/check-username)
/**
 * @swagger
 * /api/auth/check-username:
 *   get:
 *     summary: "닉네임 중복 확인"
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: nickname
 *         schema:
 *           type: string
 *         required: true
 *         description: "확인할 유저 닉네임"
 *     responses:
 *       200:
 *         description: "닉네임 사용 가능 여부"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "USER200"
 *                 message:
 *                   type: string
 *                   example: "사용 가능한 닉네임입니다."
 *                 result:
 *                   type: object
 *                   properties:
 *                     isAvailable:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: "유효하지 않은 닉네임 형식"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "USER400"
 *                 message:
 *                   type: string
 *                   example: "유효하지 않은 닉네임 형식입니다."
 *                 error:
 *                   type: object
 *                   example: {}
 *       500:
 *         description: "서버 오류"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "COMMON500"
 *                 message:
 *                   type: string
 *                   example: "서버 오류가 발생했습니다."
 *                 error:
 *                   type: object
 *                   example: {}
 */
router.get('/check-username', authController.checkNickname);

// 회원가입 (POST /api/auth/signup)
/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: "회원가입"
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *          application/json:
 *            schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: ""
 *               password:
 *                 type: string
 *                 example: ""
 *                 description: "특수문자 포함, 8자 이상"
 *               confirmPassword:
 *                 type: string
 *                 example: ""
 *                 description: "비밀번호 확인 (특수문자 포함, 8자 이상)"
 *               nickname:
 *                 type: string
 *                 example: ""
 *               birth:
 *                 type: string
 *                 example: ""
 *                 description: "YYYY/MM/DD 형식"
 *               si:
 *                 type: string
 *                 example: ""
 *               gungu:
 *                 type: string
 *                 example: ""
 *     responses:
 *       201:
 *         description: "회원가입 성공"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "USER201"
 *                 message:
 *                   type: string
 *                   example: "회원가입이 완료되었습니다."
 *                 result:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: integer
 *                       example: 1
 *       400:
 *         description: "필수 입력값 누락 또는 형식 오류"
 *       409:
 *         description: "중복된 이메일 또는 닉네임"
 *       500:
 *         description: "서버 오류"
 */
router.post('/signup', isNotLoggedIn, authController.signup);

// 로그인 (POST /api/auth/login)
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: "로그인"
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "test@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "example123!!"
 *     responses:
 *       200:
 *         description: "로그인 성공"
 *         content:
 *            application/json:
 *              schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                 message:
 *                   type: string
 *                 result:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: "JWT 액세스 토큰"
 *                     user:
 *                       type: object
 *                       properties:
 *                         user_id:
 *                           type: integer
 *                         email:
 *                           type: string
 *                         nickname:
 *                           type: string
 *                         birth:
 *                           type: string
 *       400:
 *         description: "이메일 또는 비밀번호 미입력"
 *       401:
 *         description: "잘못된 이메일 또는 비밀번호"
 *       500:
 *         description: "서버 오류"
 */
router.post('/login', isNotLoggedIn, authController.login);

// 로그아웃 (POST /api/auth/logout)
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: "로그아웃"
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []   # JWT 토큰 필요
 *     responses:
 *       200:
 *         description: "로그아웃 성공"
 *         content:
 *            application/json:
 *              schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "AUTH200"
 *                 message:
 *                   type: string
 *                   example: "로그아웃이 완료되었습니다."
 *                 result:
 *                   type: object
 *                   example: {}
 *       401:
 *         description: "로그인 상태가 아님"
 *         content:
 *            application/json:
 *              schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "AUTH401"
 *                 message:
 *                   type: string
 *                   example: "로그인이 필요합니다."
 *                 error:
 *                   type: object
 *                   example: {}
 *       500:
 *         description: "서버 오류"
 */
router.post('/logout', isLoggedIn, authController.logout);

// 로그인 상태에서 사용자 정보 가져오기
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: "로그인된 사용자 정보 조회"
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []   # JWT 토큰 필요
 *     responses:
 *       200:
 *         description: "사용자 정보 조회 성공"
 *         content:
 *            application/json:
 *              schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "USER200"
 *                 message:
 *                   type: string
 *                   example: "사용자 정보 조회 성공"
 *                 result:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: integer
 *                       example: 1
 *                     email:
 *                       type: string
 *                       example: "test@example.com"
 *                     nickname:
 *                       type: string
 *                       example: "홍길동"
 *                     birth:
 *                       type: string
 *                       example: "2006/12/25"
 *                     si:
 *                       type: string
 *                       example: "서울특별시"
 *                     gungu:
 *                       type: string
 *                       example: "노원구"
 *       400:
 *         description: "JWT 토큰 누락/유효하지 않음"
 *         content:
 *            application/json:
 *              schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "AUTH400"
 *                 message:
 *                   type: string
 *                   example: "인증에 실패했습니다."
 *                 error:
 *                   type: object
 *                   example: {}
 *       404:
 *         description: "사용자 없음"
 *         content:
 *            application/json:
 *              schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "USER404"
 *                 message:
 *                   type: string
 *                   example: "사용자를 찾을 수 없습니다."
 *                 error:
 *                   type: object
 *                   example: {}
 *       500:
 *         description: "서버 오류"
 */

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.user_id, {
      attributes: ['user_id', 'email', 'nickname', 'birth', 'si', 'gungu']
    });

    if (!user) {
      return res.status(404).json(
        ApiResponse.fail({
          code: "USER404",
          message: '사용자를 찾을 수 없습니다.',
          error: {}
        })
      );
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      code: "COMMON500",
      message: '서버 오류입니다.',
      error: { detail: err.message }
    });
  }
});

// 1단계: 사용자 확인 (POST /api/auth/verify-user)
/**
 * @swagger
 * /api/auth/verify-user:
 *   post:
 *     summary: "1단계 - 사용자 확인"
 *     tags: [Users]
 *     description: "이메일과 생년월일을 입력하면 사용자가 존재하는지 확인"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - birth
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "test@example.com"
 *               birth:
 *                 type: string
 *                 description: "YYYY/MM/DD 형식"
 *                 example: "2006/12/25"
 *     responses:
 *       200:
 *         description: "사용자 확인 완료"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "USER200"
 *                 message:
 *                   type: string
 *                   example: "사용자 확인 완료"
 *       400:
 *         description: "사용자를 찾을 수 없음"
 *           content:
 *             application/json:
 *               schema:
 *                 type: string
 *                 properties:
 *                   code:
 *                     type: string
 *                     example: "USER400"
 *                   message:
 *                     type: string
 *                     example: "사용자를 찾을 수 없음"
 *       500:
 *         description: "서버 오류"
 */
router.post('/verify-user', isNotLoggedIn, authController.verifyUser);

// 2단계: 비밀번호 변경 (POST /api/auth/reset-password)
/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: "비밀번호 재설정"
 *     tags: [Users]
 *     description: "사용자 확인 후 새 비밀번호를 입력하여 비밀번호를 변경. 세션 기반 사용자 확인 필요."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 example: "NewPassword123@"
 *               confirmPassword:
 *                 type: string
 *                 example: "NewPassword123@"
 *     responses:
 *       200:
 *         description: "비밀번호 변경 완료"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "USER200"
 *                 message:
 *                   type: string
 *                   example: "비밀번호 변경 완료"
 *       400:
 *         description: "잘못된 요청 (세션 없음, 비밀번호 불일치 등)"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "USER400"
 *                 message:
 *                   type: string
 *                   example: "사용자 확인이 필요합니다."
 *       404:
 *         description: "사용자를 찾을 수 없음"
 *           content:
 *             application/json:
 *               schema:
 *                 type: string
 *                 properties:
 *                   code:
 *                     type: string
 *                     example: "USER404"
 *                   message:
 *                     type: string
 *                     example: "사용자를 찾을 수 없거나 비밀번호가 일치하지 않습니다."
 *       500:
 *         description: "서버 오류"
 */
router.post('/reset-password', isNotLoggedIn, authController.resetPassword);


module.exports = router;
