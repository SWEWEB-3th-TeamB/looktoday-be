const express = require('express');
const router = express.Router();

const looksControllers = require('../controllers/looksControllers.js');

// GET /api/looks - 룩 목록 조회(최신순/인기순)
router.get('/', looksControllers.getLooks);

// POST /api/looks/:lookId/like - 게시물 좋아요
router.post('/:looktodayId/like', looksControllers.likePost);

// DELETE /api/looks/:lookId/like - 게시물 좋아요 취소
router.delete('/:looktodayId/like', looksControllers.unlikePost);

module.exports = router;