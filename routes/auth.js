const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllers');
const verifyToken = require('../middlewares/authMiddleware');

// 이메일 중복 확인 (GET /api/auth/check-email)
router.get('/check-email', authController.checkEmail);

// 닉네임 중복 확인 (GET /api/auth/check-username)
router.get('/check-username', authController.checkNickname);

// 회원가입 (POST /api/auth/signup)
router.post('/signup', authController.signup);

//로그인 (POST /api/auth/login)
router.post('/login', authController.login);

//로그아웃 (Post /api/auth/logout)
router.post('/logout', authController.logout);

module.exports = router;