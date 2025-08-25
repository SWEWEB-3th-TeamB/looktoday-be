const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllers');

const { authMiddleware, isLoggedIn, isNotLoggedIn } = require('../middlewares/authMiddleware');
const db = require('../models');
const User = db.User;

const verifyToken = require('../middlewares/authMiddleware');

// 이메일 중복 확인 (GET /api/auth/check-email)
router.get('/check-email', authController.checkEmail);

// 닉네임 중복 확인 (GET /api/auth/check-username)
router.get('/check-username', authController.checkNickname);

// 회원가입 (POST /api/auth/signup)
router.post('/signup', isNotLoggedIn, authController.signup);

//로그인 (POST /api/auth/login)
router.post('/login', isNotLoggedIn, authController.login);

//로그아웃 (Post /api/auth/logout)
router.post('/logout', isLoggedIn, authController.logout);


// 로그인 상태에서 사용자 정보 가져오기
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // authMiddleware에서 req.user에 토큰 정보(id, email) 넣어줌
    const user = await User.findByPk(req.user.id, {
      attributes: ['user_id', 'email', 'nickname', 'birth', 'si', 'gungu']
    });

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류입니다.' });
  }
});



module.exports = router;
