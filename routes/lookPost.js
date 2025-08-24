const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const AWS = require('aws-sdk');
//const fs = require('fs');
const { isLoggedIn } = require('../middlewares');

require('dotenv').config();

module.exports = (db) => {
  const router = express.Router();
  const { Post, Image, sequelize, Sequelize: { Op } } = db;

  // AWS S3 설정
  AWS.config.update({
    accessKeyId: process.env.S3_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    region: 'ap-northeast-2'
  });

  const s3 = new AWS.S3();

  // multer s3 설정
  const upload = multer({
    storage: multerS3({
      s3,
      bucket: process.env.S3_BUCKET_NAME,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      acl: 'public-read',
      key(req, file, cb) {
        //파일 경로 및 이름 설정
        cb(null, `uploads/${Date.now()}_${path.basename(file.originalname)}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
  });

  // S3 파일 삭제 함수
  const deleteFile = async (imageUrl) => {
    // imageUrl이 유효한 s3 주소인지 확인
    if (!imageUrl || !imageUrl.includes(process.env.S3_BUCKET_NAME)) {
        console.log("유효한 S3 URL이 아니므로 삭제를 건너뜁니다.");
        return;
    }
    try {
        const url = new URL(imageUrl);
        const key = url.pathname.substring(1); // 맨 앞의 '/' 제거

        await s3.deleteObject({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key
        }).promise();
        console.log(`S3 파일 삭제 성공: ${key}`);

    } catch (error) {
        console.error(`S3 파일 삭제 실패: ${imageUrl}`, error);
    }
  }; 

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
        //weather,
        date,
        hour,
        isPublic,
        si, 
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
        (isPublic !== 'true' && isPublic !== 'false') || !si || !gungu ||
        !date || !hour // || !weather
      ) {
        return res.status(400).json({
          success: false,
          message: "필수 항목이 누락되었거나 이미지가 없습니다."
        });
      }

      // DB에 이미지 정보 저장
      const savedImage = await Image.create({
        imageUrl: req.file.location // DB에 S3 파일 URL 저장
      });

      const user_id = req.user.user_id; // 로그인 사용자 ID
      const previousCount = await Post.count({ where: { user_id } }); // 지금까지 쓴 게시글 수 확인

      const newPost = await Post.create({
        user_id,
        post_count: previousCount + 1,
        si,
        gungu,
        apparent_temp,
        apparent_humidity,
        //weather,
        isPublic: isPublic === 'true', // 문자열 → boolean 변환
        comment,
        date,
        hour
      });

      // 이미지와 포스트 연결
      await savedImage.update({ looktoday_id: newPost.looktoday_id });

      return res.status(201).json({
        success: true,
        looktoday_id: newPost.looktoday_id,
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

  // PUT /api/lookPost/:looktoday_id 이미지+게시물 수정
  router.put('/lookPost/:looktoday_id', isLoggedIn, upload.single('image'), async (req, res) => {
    try {
      const { looktoday_id } = req.params;
      const {
        comment,
        apparent_temp,
        apparent_humidity,
        isPublic,
        si,
        gungu,
        date,
        hour,
        //weather
    } = req.body;

    // 코멘트 길이 검사
      if (comment && comment.length > 40) {
        return res.status(400).json({
          success: false, 
          message: "코멘트는 최대 40자까지 입력할 수 있습니다."
        })
      }

    // 게시물 존재 확인
    const post = await Post.findOne({ where: { looktoday_id } });
    if (!post) {
      return res.status(404).json({ success: false, message: "게시물을 찾을 수 없습니다." });
    }

    // 권한 확인 
    if (post.user_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: "수정 권한이 없습니다." });
    }

    // 이미지 수정 
    if (req.file) {
      // 기존 이미지 찾아서 교체
      const image = await Image.findOne({ where: { looktoday_id } });
      if (image) {
        await deleteFile(image.imageUrl); // 기존 파일 삭제
        await image.update({ imageUrl: req.file.location }); // 이미지 URL 업데이트
      } else {
        // 기존 이미지 없으면 새로 생성
        await Image.create({
          imageUrl: req.file.location,
          looktoday_id
        });
      }
    }

    await post.update({ // 업데이트
      si,
      gungu,
      apparent_temp,
      apparent_humidity,
      //weather,
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

  // DELETE /api/lookPost/:looktoday_id 이미지+게시물 삭제
  router.delete('/lookPost/:looktoday_id', isLoggedIn, async (req, res) => {
    // 데이터 일관성을 위한 트랜잭션 시작
    const t = await sequelize.transaction();
    try {
      const { looktoday_id } = req.params;

      //삭제할 게시물을 트랜잭션 안에서 조회
      const post = await Post.findOne({ 
        where: { looktoday_id },
        transaction: t
      });

      // 게시물 존재 확인
      if (!post) {
        await t.rollback(); // 트랜잭션 롤백
        return res.status(404).json({ success: false, message: "게시물이 존재하지 않습니다." });
      }

      // 권한 확인
      if (post.user_id !== req.user.user_id) {
        await t.rollback(); // 트랜잭션 롤백
        return res.status(403).json({ success: false, message: "삭제 권한이 없습니다." });
      }

      const deletedPostCount = post.post_count;

      // 이미지와 게시물 삭제
      const images = await Image.findAll({ where: { looktoday_id }, transaction: t });
      for (const image of images) {
        await deleteFile(image.imageUrl); // S3에 있는 실제 파일 삭제
      }
      await Image.destroy({ where: { looktoday_id }, transaction: t });
      await Post.destroy({ where: { looktoday_id }, transaction: t });

      // 사용자 게시물 수 감소
      await Post.update(
        { post_count: sequelize.literal('post_count - 1') },
        {
          where: {
            user_id: post.user_id,
            post_count: { [Op.gt]: deletedPostCount },
          },
          transaction: t
        }
      );

      await t.commit(); // 트랜잭션 커밋

      return res.status(200).json({
        success: true,
        message: `게시물 ${ looktoday_id }이 성공적으로 삭제되었습니다.`
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