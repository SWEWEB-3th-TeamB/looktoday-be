// middlewares/uploadMiddleware.js
require('dotenv').config();
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3'); 

// AWS S3 설정
const s3 = new S3Client({
    region: 'ap-northeast-2',
    credentials: {
        accessKeyId: process.env.S3_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
});

// multer s3 설정
const upload = multer({
    storage: multerS3({
        s3,
        bucket: process.env.S3_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        // acl: 'public-read',
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

        await s3.send(new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key
        }));
        console.log(`S3 파일 삭제 성공: ${key}`);

    } catch (error) {
        console.error(`S3 파일 삭제 실패: ${imageUrl}`, error);
    }
};

module.exports = {
    upload,
    deleteFile
};

