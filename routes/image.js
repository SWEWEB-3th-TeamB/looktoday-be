// routes/image.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

module.exports = (db) => {
  const router = express.Router();
  const { Image } = db;
  
  // uploads 폴더 없으면 생성
  try {
    fs.readdirSync('uploads');
  } catch (error) {
    console.error('uploads 폴더가 없어 uploads 폴더를 생성합니다.');
    fs.mkdirSync('uploads');
  }
 
  // multer 설정
  const upload = multer({
    storage: multer.diskStorage({
      destination(req, file, cb) {
        cb(null, 'uploads/');
      },
      filename(req, file, cb) {
        const ext = path.extname(file.originalname); // 확장자 추출 (.jpg, .png 등)
        const uniqueName = path.basename(file.originalname, ext) + '_' + Date.now() + ext;
        cb(null, uniqueName);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
  });
  
  // POST /api/image
  router.post('/image', upload.single('image'), async(req, res) => { // 이미지 여러 개 업로드해야하면 upload.array('images') 사용
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '이미지 파일이 선택되지 않았습니다.',
      });
    }

    // DB에 이미지 정보 저장
    try {
      const savedImage = await Image.create({
        imageUrl: req.file.filename
      });

    return res.json({
      success: true,
      imageUrl: req.file.filename,
      imageId: savedImage.image_id,
      message: '이미지 업로드 성공'
    });
  } catch (err) {
    console.error('DB 저장 실패:', err);
    res.status(500).json({
      success: false,
      message: 'DB 저장 중 오류가 발생했습니다.',
    });
  }
});

// 파일 크기 초과 에러 처리
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
        success: false,
        message: `이미지 업로드에 실패했습니다. 파일 크기를 확인해주세요. (최대 5MB)`,
      });
    }
    next(err);
  });

  return router;
};