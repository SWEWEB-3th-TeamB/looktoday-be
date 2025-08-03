const express = require('express');
const { isLoggedIn } = require('../middlewares');
const { Post } = require('../models/post'); 
const router = express.Router();

  
router.use(express.json()); // postman했는데 안돼서 추가

router.post('/lookPost', (req, res) => {
  console.log('✅ POST 요청 들어옴!', req.body);
  res.json({ success: true, message: '요청 성공' });
});

// POST /api/lookPost
//router.post('/api/lookPost', isLoggedIn, express.json(), async (req, res) => { // 테스트용
router.post('/lookPost', express.json(), async (req, res) => {
  try {
    const {
      imageUrl,
      comment,
      temperatureFeeling,
      humidityFeeling,
      isPublic,
      location,
      date,
      weatherType
    } = req.body;

    // 필수값 확인
    if (
      !imageUrl || !comment || !temperatureFeeling || !humidityFeeling ||
      typeof isPublic !== 'boolean' || !location?.sido || !location?.sigungu ||
      !date || !weatherType
    ) {
      return res.status(400).json({
        success: false,
        message: "필수 항목이 누락되었습니다. 모든 입력값을 확인해주세요."
      });
    }

    // DB에 저장하는 코드 추가 필요
    const postId = 987; // 예시 postId

    console.log('새 게시물 저장됨:', {
      user: req.user?.id || 'anonymous', // 실제론 로그인 사용자 ID
      imageUrl,
      comment,
      temperatureFeeling,
      humidityFeeling,
      isPublic,
      location,
      date,
      weatherType
    });

    return res.status(201).json({
      success: true,
      postId,
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
router.put('/lookPost/:id', isLoggedIn, express.json(), async (req, res) => {
  const { id } = req.params;
  const { imageUrl, comment, temperatureFeeling, humidityFeeling, isPublic, location, date, weatherType } = req.body;

  // 1. 필수값 확인
  if (
    !imageUrl || !comment || !temperatureFeeling || !humidityFeeling ||
    typeof isPublic !== 'boolean' || !location?.sido || !location?.sigungu ||
    !date || !weatherType
  ) {
    return res.status(400).json({
      success: false,
      message: "필수 항목이 누락되었습니다. 모든 입력값을 확인해주세요."
    });
  }

  try {
    // 2. 게시물 존재 확인
    const post = await Post.findOne({ where: { looktoday_id: id } });
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "게시물을 찾을 수 없습니다."
      });
    }

    // 3. 권한 확인
    if (post.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "수정 권한이 없습니다."
      });
    }

   // 4. 업데이트
    await post.update({
      image_url: imageUrl,
      comment,
      temperature_feeling: temperatureFeeling,
      humidity_feeling: humidityFeeling,
      is_public: isPublic,
      location_sido: location.sido,
      location_sigungu: location.sigungu,
      date,
      weather_type: weatherType
    });

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
    // 1. 게시물 존재 확인 
    // const post = await LookPost.findByPk(postId);
    const post = { userId: 'anonymous' }; // 임시 데이터 

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "게시물이 존재하지 않습니다."
      });
    }

    // 2. 권한 확인
    if (post.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "삭제 권한이 없습니다."
      });
    }

    // 3. 게시물 삭제
    // await LookPost.destroy({ where: { id } });

    console.log(`게시물 ${id}이 삭제되었습니다.`); // 임시 로그

    return res.status(200).json({
      success: true,
      message: "게시물이 성공적으로 삭제되었습니다."
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "서버 에러가 발생했습니다."
    });
  }
});

module.exports = router;