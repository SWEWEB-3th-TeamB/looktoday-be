const express = require('express');
const { isLoggedIn } = require('../middlewares');

module.exports = (db) => {
  const router = express.Router();
  const { Post, Image } = db;

  router.use(express.json());

  // 게시물 업로드 POST /api/lookPost
  //router.post('/api/lookPost', isLoggedIn, express.json(), async (req, res) => { // 테스트용
  router.post('/lookPost', async (req, res) => {
    try {
      const {
        imageUrl,
        comment,
        apparent_temp,
        apparent_humidity,
        isPublic,
        si,
        gungu,
        date,
        weather
      } = req.body;

      // 필수값 확인
      if (
        !imageUrl || !comment || !apparent_temp || !apparent_humidity ||
        typeof isPublic !== 'boolean' || !si || !gungu ||
        !date || !weather
      ) {
        return res.status(400).json({
          success: false,
          message: "필수 항목이 누락되었습니다. 모든 입력값을 확인해주세요."
        });
      }

      const newPost = await Post.create({
        user_id: req.user?.id || 1, // 실제론 로그인 사용자 ID
        si,
        gungu,
        apparent_temp,
        apparent_humidity,
        weather,
        isPublic,
        comment,
        date
      });

      await Image.create({
        imageUrl,
        looktoday_id: newPost.looktoday_id,
      });

      return res.status(201).json({
        success: true,
        postId: newPost.looktoday_id,
        message: "코디가 성공적으로 업로드되었습니다."
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "서버 오류로 인해 게시물을 업로드할 수 없습니다. 잠시 후 다시 시도해주세요."
      });
    }
  });

  // PUT /api/lookPost/:id 게시물 수정
  router.put('/lookPost/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const {
      imageUrl,
      comment,
      apparent_temp,
      apparent_humidity,
      isPublic,
      si,
      gungu,
      date,
      weather
    } = req.body;

    // 필수값 확인
    if (
      !imageUrl || !comment || !apparent_temp || !apparent_humidity ||
      typeof isPublic !== 'boolean' || !si || !gungu ||
      !date || !weather
    ) {
      return res.status(400).json({
        success: false,
        message: "필수 항목이 누락되었습니다. 모든 입력값을 확인해주세요."
      });
    }

    try {
      const post = await Post.findOne({ where: { looktoday_id: id } });
      if (!post) { // 게시물 존재 확인
        return res.status(404).json({ success: false, message: "게시물을 찾을 수 없습니다." });
      }

      if (post.user_id !== req.user.id) { // 권한 확인
        return res.status(403).json({ success: false, message: "수정 권한이 없습니다." });
      }

      await post.update({ // 업데이트
        si,
        gungu,
        apparent_temp,
        apparent_humidity,
        weather,
        isPublic,
        comment,
        date
      });

      await Image.update({ imageUrl }, { where: { looktoday_id: id } });

      return res.status(200).json({
        success: true,
        message: "게시물이 성공적으로 수정되었습니다."
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "서버 에러가 발생했습니다."
      });
    }
  });

  // DELETE /api/lookPost/:id 게시물 삭제
  router.delete('/lookPost/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;

    try {
      const post = await Post.findOne({ where: { looktoday_id: id } });
      if (!post) { // 게시물 존재 확인
        return res.status(404).json({ success: false, message: "게시물이 존재하지 않습니다." });
      }

      if (post.user_id !== req.user.id) { // 권한 확인
        return res.status(403).json({ success: false, message: "삭제 권한이 없습니다." });
      }

      // 이미지와 게시물 삭제
      await Image.destroy({ where: { looktoday_id: id } });
      await Post.destroy({ where: { looktoday_id: id } });

      return res.status(200).json({
        success: true,
        message: `게시물 ${id}이 성공적으로 삭제되었습니다.`
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "서버 에러가 발생했습니다."
      });
    }
  });

};

module.exports = router;