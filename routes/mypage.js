// const express = require('express');
// const router = express.Router();
// const { authMiddleware } = require('../middlewares/authMiddleware');
// const mypage = require('../controllers/mypageController');

// // 모든 마이페이지 API는 로그인 필수
// router.use(authMiddleware);

// // 내 프로필 수정
// router.put('/me', mypage.updateProfile);

// // 내 피드(내가 올린 게시글) 조회 + 기간/월/날짜범위 필터 + 페이징
// router.get('/me/feed', mypage.getMyLooks);

// // 내 좋아요한 게시글 목록
// router.get('/me/likes', mypage.getMyLikes);

// // 내 게시글 삭제
// router.delete('/posts/:postId', mypage.deleteMyLook);

// module.exports = router;
