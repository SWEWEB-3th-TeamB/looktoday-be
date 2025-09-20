const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middlewares/authMiddleware');

// 내 정보
router.get('/me', verifyToken, userController.getMe);

// 내 지역 날씨 (프론트는 이거 하나만 호출하면 됨)
router.get('/me/weather', verifyToken, userController.getMyWeather);

module.exports = router;
