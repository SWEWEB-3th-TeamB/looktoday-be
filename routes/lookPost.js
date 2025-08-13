const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isLoggedIn } = require('../middlewares');

module.exports = (db) => {
  const router = express.Router();
  const { Post, Image, sequelize, Sequelize: { Op } } = db;

  // uploads 폴더 없으면 생성
  try {
    fs.readdirSync('uploads');
  } catch (error) {
    console.log('uploads 폴더가 없어 생성합니다.');
    fs.mkdirSync('uploads');
  }

  // multer 설정
  const upload = multer({
    storage: multer.diskStorage({
      destination(req, file, cb) {
        cb(null, 'uploads/');
      },
      filename(req, file, cb) {
        const ext = path.extname(file.originalname); // 확장자 (.jpg, .png 등)
        const uniqueName = path.basename(file.originalname, ext) + '_' + Date.now() + ext;
        cb(null, uniqueName);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
  });

  // POST /api/lookPost — 이미지 + 게시글 동시 업로드
  router.post('/lookPost', isLoggedIn, upload.single('image'), async (req, res) => {
    console.log('--- Request Body ---');  // 확인용 로그 
    console.log(req.body);
    console.log('--- Request File ---');
    console.log(req.file);

    console.log('--- Logged In User Info ---');
    console.log(req.user);

    try {
      const {
        weather,
        date,
        hour,
        isPublic,
        sido, 
        gungu, 
        apparent_temp, 
        apparent_humidity, 
        comment, 
      } = req.body;

      // 코멘트 길이 검사
      if (comment && comment.length > 40) {
        return res.status(400).json({
          success: false, 
          message: "코멘트는 최대 40자까지 입력할 수 있습니다."
        })
      }

      // 필수값 체크 (form-data라 isPublic은 문자열일 수 있음)
      if (
        !req.file || !comment || !apparent_temp || !apparent_humidity ||
        (isPublic !== 'true' && isPublic !== 'false') || !sido || !gungu ||
        !date || !hour || !weather
      ) {
        return res.status(400).json({
          success: false,
          message: "필수 항목이 누락되었거나 이미지가 없습니다."
        });
      }

      // DB에 이미지 정보 저장
      const savedImage = await Image.create({
        imageUrl: req.file.filename
      });

      const userId = req.user.id; // 로그인 사용자 ID
      const previousCount = await Post.count({ where: { id: userId } }); // 지금까지 쓴 게시글 수 확인

      const newPost = await Post.create({
        id: userId,
        post_count: previousCount + 1,
        sido,
        gungu,
        apparent_temp,
        apparent_humidity,
        weather,
        isPublic: isPublic === 'true', // 문자열 → boolean 변환
        comment,
        date,
        hour
      });

      // 이미지와 포스트 연결
      await savedImage.update({ looktoday_id: newPost.looktoday_id });

      return res.status(201).json({
        success: true,
        postId: newPost.looktoday_id,
        imageId: savedImage.image_id,
        message: '포스트가 성공적으로 업로드되었습니다.'
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "서버 오류로 인해 업로드에 실패했습니다."
      });
    }
  });

  // PUT /api/lookPost/:id 이미지+게시물 수정
  router.put('/lookPost/:postId', isLoggedIn, upload.single('image'), async (req, res) => {
    try {
      const { postId } = req.params;
      const {
        comment,
        apparent_temp,
        apparent_humidity,
        isPublic,
        sido,
        gungu,
        date,
        hour,
        weather
    } = req.body;

    // 코멘트 길이 검사
      if (comment && comment.length > 40) {
        return res.status(400).json({
          success: false, 
          message: "코멘트는 최대 40자까지 입력할 수 있습니다."
        })
      }

    // 게시물 존재 확인
    const post = await Post.findOne({ where: { looktoday_id: postId } });
    if (!post) {
      return res.status(404).json({ success: false, message: "게시물을 찾을 수 없습니다." });
    }

    // 권한 확인 
    if (post.id !== req.user.id) {
      return res.status(403).json({ success: false, message: "수정 권한이 없습니다." });
    }

    // 이미지 수정 
    if (req.file) {
      // 기존 이미지 찾아서 교체
      const image = await Image.findOne({ where: { looktoday_id: postId } });
      if (image) {
        await image.update({ imageUrl: req.file.filename });
      } else {
        // 기존 이미지 없으면 새로 생성
        await Image.create({
          imageUrl: req.file.filename,
          looktoday_id: postId
        });
      }
    }
    await post.update({ // 업데이트
      sido,
      gungu,
      apparent_temp,
      apparent_humidity,
      weather,
      isPublic: isPublic === 'true',
      comment,
      date,
      hour
    });

    return res.status(200).json({
       success: true,
       message: "게시물이 성공적으로 수정되었습니다.",
     });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "서버 에러가 발생했습니다."
      });
    }
  });

  // DELETE /api/lookPost/:postId 이미지+게시물 삭제
  router.delete('/lookPost/:postId', isLoggedIn, async (req, res) => {
    // 데이터 일관성을 위한 트랜잭션 시작 
    const t = await sequelize.transaction();
    try {
      const { postId } = req.params;

      //삭제할 게시물을 트랜잭션 안에서 조회
      const post = await Post.findOne({ 
        where: { looktoday_id: postId },
        transaction: t
      });

      // 게시물 존재 확인
      if (!post) {
        await t.rollback(); // 트랜잭션 롤백
        return res.status(404).json({ success: false, message: "게시물이 존재하지 않습니다." });
      }

      // 권한 확인
      if (post.id !== req.user.id) {
        await t.rollback(); // 트랜잭션 롤백
        return res.status(403).json({ success: false, message: "삭제 권한이 없습니다." });
      }

      const userId = post.id; // 삭제하는 사용자의 ID 
      const deletedPostCount = post.post_count;

      // 이미지와 게시물 삭제
      await Image.destroy({ where: { looktoday_id: postId }, transaction: t });
      await Post.destroy({ where: { looktoday_id: postId }, transaction: t });

      // 사용자 게시물 수 감소
      await Post.update(
        { post_count: sequelize.literal('post_count - 1') },
        {
          where: {
            id: userId,
            post_count: { [Op.gt]: deletedPostCount },
          },
          transaction: t
        }
      );

      await t.commit(); // 트랜잭션 커밋

      return res.status(200).json({
        success: true,
        message: `게시물 ${postId}이 성공적으로 삭제되었습니다.`
      });

    } catch (error) {
      await t.rollback(); // 트랜잭션 롤백
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "서버 에러가 발생했습니다."
      });
    }
  });

  return router;
};