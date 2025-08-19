const express = require('express');
const router = express.Router();

const looksControllers = require('../controllers/looksControllers.js');

const authMiddleware = require('../middlewares/authMiddleware.js');

// GET /api/looks - 룩 목록 조회
router.get('/', looksControllers.getLooks);

// GET /api/looks/best - BEST 10 룩 조회
router.get('/best', looksControllers.getBestLooks);

//GET /api/(/api/looks/:lookId) - 게시물 상세 조회
router.get('/:looktoday_id', looksControllers.getLookDetail);

// POST /api/looks/:lookId/like - 게시물 좋아요
router.post('/:looktoday_id/like', authMiddleware, looksControllers.likePost);

// DELETE /api/looks/:lookId/like - 게시물 좋아요 취소
router.delete('/:looktoday_id/like', authMiddleware, looksControllers.unlikePost);

module.exports = router;