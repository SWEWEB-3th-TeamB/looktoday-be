// routes/sun.js
const express = require('express');
const router = express.Router();
const { getSunTimesBySiGungu } = require('../services/sunService');

router.get('/', (req, res) => {
  const { si, gungu, date } = req.query;
  if (!si || !gungu) {
    return res.status(400).json({ message: 'si, gungu는 필수입니다.' });
  }
  try {
    const data = getSunTimesBySiGungu({ si, gungu, date });
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

module.exports = router;
