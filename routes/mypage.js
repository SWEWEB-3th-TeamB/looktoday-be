const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const mypageController = require('../controllers/mypageControllers');
const authController = require('../controllers/authControllers');
const db = require('../models');
const User = db.User;

// 이메일 중복 확인 (GET /api/auth/check-email)
router.get('/check-email', authController.checkEmail);

// 닉네임 중복 확인 (GET /api/auth/check-username)
router.get('/check-username', authController.checkNickname);

// 모든 마이페이지 API는 로그인 필수
router.use(authMiddleware);

// 내 프로필 수정
router.put('/me', mypageController.updateProfile);

// 내 피드(내가 올린 게시글) 조회 + 기간/월/날짜범위 필터 + 페이징
router.get('/me/feeds', mypageController.getMyFeeds);

// 내 좋아요한 게시글 목록
router.get('/me/likes', mypageController.getMyLikes);

// 내 게시글 삭제
router.delete('/posts/:postId', mypageController.deleteMyLook);

module.exports = router;
