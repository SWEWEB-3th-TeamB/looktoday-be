// services//lookPostService.js
const db = require('../models');
const { Post, Image, UltraNowcast, sequelize, Sequelize } = db;
const { Op } = Sequelize;
const { deleteFile } = require('../middlewares/uploadMiddleware');
const { toBaseDateTime } = require('../utils/dateTime');

// Custom Error Class
class ServiceError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

// UltraNowCast 조회 함수
async function findWeather(si, gungu, date, hour) {
    const { baseDate, baseTime } = toBaseDateTime(date, hour);
    return UltraNowcast.findOne({ where: { si, gungu, baseDate, baseTime } });
}

exports.createPost = async (user, body, file) => {
    const {
        date,
        hour,
        isPublic,
        si,
        gungu,
        apparent_temp,
        apparent_humidity,
        comment,
    } = body;

    // 코멘트 길이 검사
    if (comment && comment.length > 40) {
        throw new ServiceError("코멘트는 최대 40자까지 입력할 수 있습니다.", 400);
    }

    // 필수값 체크 (form-data라 isPublic은 문자열일 수 있음)
    if (
        !file || !comment || !apparent_temp || !apparent_humidity ||
        (isPublic !== 'true' && isPublic !== 'false') || !si || !gungu ||
        !date || !hour
    ) {
        throw new ServiceError("필수 항목이 누락되었거나 이미지가 없습니다.", 400);
    }

    // DB에 이미지 정보 저장
    const imageUrl = file.location || file.url;
    const savedImage = await Image.create({
        imageUrl // DB에 S3 파일 URL 저장
    });

    const user_id = user.user_id; // 로그인 사용자 ID
    const previousCount = await Post.count({ where: { user_id } }); // 지금까지 쓴 게시글 수 확인
    const weatherRow = await findWeather(si, gungu, date, hour); // 날씨 조회 시도

    const newPost = await Post.create({
        user_id,
        post_count: previousCount + 1,
        si,
        gungu,
        apparent_temp,
        apparent_humidity,
        isPublic: isPublic === 'true', // 문자열 → boolean 변환
        comment,
        date,
        hour,
        weather_id: weatherRow ? weatherRow.id : null // 없으면 null
    });

    // 이미지와 포스트 연결
    await savedImage.update({ looktoday_id: newPost.looktoday_id });

    return {
        looktoday_id: newPost.looktoday_id,
        imageId: savedImage.image_id,
    };
};

exports.updatePost = async (looktoday_id, user, body, file) => {
    const {
        comment,
        apparent_temp,
        apparent_humidity,
        isPublic,
        si,
        gungu,
        date,
        hour,
    } = body;

    // 코멘트 길이 검사
    if (comment && comment.length > 40) {
        throw new ServiceError("코멘트는 최대 40자까지 입력할 수 있습니다.", 400);
    }

    // 게시물 존재 확인
    const post = await Post.findOne({ where: { looktoday_id } });
    if (!post) {
        throw new ServiceError("게시물을 찾을 수 없습니다.", 404);
    }

    // 권한 확인 
    if (post.user_id !== user.user_id) {
        throw new ServiceError("수정 권한이 없습니다.", 403);
    }

    // 이미지 수정 
    if (file) {
        // 기존 이미지 찾아서 교체
        const image = await Image.findOne({ where: { looktoday_id } });
        const imageUrl = file.location || file.url;
        if (image) {
            await deleteFile(image.imageUrl); // 기존 파일 삭제
            await image.update({ imageUrl }); // 이미지 URL 업데이트
        } else {
            // 기존 이미지 없으면 새로 생성
            await Image.create({
                imageUrl,
                looktoday_id
            });
        }
    }

    const weatherRow = await findWeather(
        si ?? post.si, gungu ?? post.gungu, date ?? post.date, hour ?? post.hour); // 날씨 조회 시도

    await post.update({ // 업데이트
        si,
        gungu,
        apparent_temp,
        apparent_humidity,
        isPublic: isPublic !== undefined ? (isPublic === 'true') : post.isPublic,
        comment,
        date,
        hour,
        weather_id: weatherRow ? weatherRow.id : null // 없으면 null
    });
};

exports.deletePost = async (looktoday_id, user) => {
    // 데이터 일관성을 위한 트랜잭션 시작
    const t = await sequelize.transaction();
    try {
        //삭제할 게시물을 트랜잭션 안에서 조회
        const post = await Post.findOne({
            where: { looktoday_id },
            transaction: t
        });

        // 게시물 존재 확인
        if (!post) {
            await t.rollback(); // 트랜잭션 롤백
            throw new ServiceError("게시물이 존재하지 않습니다.", 404);
        }

        // 권한 확인
        if (post.user_id !== user.user_id) {
            await t.rollback(); // 트랜잭션 롤백
            throw new ServiceError("삭제 권한이 없습니다.", 403);
        }

        const deletedPostCount = post.post_count;
        const images = await Image.findAll({ where: { looktoday_id }, transaction: t });

        // DB 삭제 -> commit -> S3 삭제 
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

        for (const image of images) {
            await deleteFile(image.imageUrl); // commit 후 S3 파일 삭제
        }

    } catch (error) {
        if (t) await t.rollback(); // 트랜잭션 롤백
        if (error instanceof ServiceError) {
            throw error;
        }
        throw error;
    }
};