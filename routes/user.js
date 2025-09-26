const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middlewares/authMiddleware');

// 내 정보
router.get('/me', verifyToken, userController.getMe);

// 내 지역 날씨 (쿼리로 si,gungu 허용)
router.get('/me/weather', verifyToken, userController.getMyWeather);

// 내 지역 저장/수정
router.patch('/me/region', verifyToken, userController.updateMyRegion);

module.exports = router;
