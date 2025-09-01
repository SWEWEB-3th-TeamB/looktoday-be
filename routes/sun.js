const express = require('express');
const router = express.Router();
// ✅ 한글 키로 응답 주는 함수로 교체
const { getSunTimesKoBySiGungu } = require('../services/sunService');

router.get('/', (req, res) => {
  const { si, gungu, date } = req.query;
  if (!si || !gungu) {
    return res.status(400).json({ message: 'si, gungu는 필수입니다.' });
  }
  try {
    const data = getSunTimesKoBySiGungu({ si, gungu, date });
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

module.exports = router;