// routes/lookPost.js 
const express = require('express');
const router = express.Router();
const lookPostController = require('../controllers/lookPostControllers');
const { isLoggedIn } = require('../middlewares/authMiddleware'); // 기존 인증 미들웨어
const { upload } = require('../middlewares/uploadMiddleware'); // 파일 업로드 미들웨어

// POST /api/lookPost — 이미지 + 게시글 업로드
router.post('/', isLoggedIn, upload.single('image'), lookPostController.createPost);

// PUT /api/lookPost/:looktoday_id — 게시글 수정
router.put('/:looktoday_id', isLoggedIn, upload.single('image'), lookPostController.updatePost);

// DELETE /api/lookPost/:looktoday_id — 게시글 삭제
router.delete('/:looktoday_id', isLoggedIn, lookPostController.deletePost);

module.exports = router;