const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');

// GET /api/weather 요청이 들어오면 weatherController.getWeather 함수를 실행합니다.
router.get('/', weatherController.getWeather);

module.exports = router;