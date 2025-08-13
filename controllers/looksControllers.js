const { Post, Like, Image } = require('../models');
const { ApiResponse } = require('../response');

exports.getLooks = async (req, res) => {
    try {
        const { sort = 'latest', page = 1, limit = 20 } = req.query;
        
        const looks = await Post.findAll({
            include: [{
                model: Image, // Image 모델을 포함
                attributes: ['imageUrl'], // Image 테이블에서는 imageUrl 컬럼만 가져옴
            }],
            order: [
                sort === 'popular' ? ['likeCount', 'DESC'] : ['date', 'DESC']
            ],
            offset: (page - 1) * limit,
            limit: parseInt(limit),
        });
        
        const totalPosts = await Post.count();
        const totalPages = Math.ceil(totalPosts / limit);
        
        const result = {
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalPosts: totalPosts,
                totalPages: totalPages
            },
            looks: looks
        };

        const message = sort === 'popular' ? "인기 룩 목록 조회 성공" : "최신 룩 목록 조회 성공";
        return res.status(200).json(ApiResponse.success({ code: "LOOKS200", message, result }));

    } catch (error) {
        return res.status(500).json(ApiResponse.fail({ code: "LOOKS500", message: error.message }));
    }
};

exports.likePost = async (req, res) => {
    try {
        const { looktodayId } = req.params;
        const { userId } = req.body; 

         const existingLike = await Like.findOne({
            where: {
                user_id: userId,
                looktoday_id: looktodayId
            }
        });

        if (existingLike) {
            return res.status(409).json(ApiResponse.fail({ code: "LIKE409", message: "이미 좋아요를 누른 게시물입니다." }));
        }

        await Like.create({
            user_id: userId,
            looktoday_id: looktodayId,
        });

        await Post.increment('likeCount', { where: { looktoday_id: looktodayId } });

        const result = {
            looktodayId: parseInt(looktodayId),
            userId: userId,
            isLiked: true
        };
        
        return res.status(201).json(ApiResponse.success({ code: "LIKE201", message: "좋아요 처리가 완료되었습니다.", result }));

    } catch (error) {
        return res.status(500).json(ApiResponse.fail({ code: "LOOKS500", message: error.message }));
    }
};

exports.unlikePost = async (req, res) => {
    try {
        const { looktodayId } = req.params;
        const { userId } = req.body;

        const existingLike = await Like.findOne({
            where: {
                user_id: userId,
                looktoday_id: looktodayId
            }
        });

        if (!existingLike) {
            return res.status(404).json(ApiResponse.fail({ code: "LIKE404", message: "좋아요 기록을 찾을 수 없습니다." }));
        }

        await existingLike.destroy();

        await Post.decrement('likeCount', { where: { looktoday_id: looktodayId } });
        
        const result = {
            looktodayId: parseInt(looktodayId),
            userId: userId,
            isLiked: false
        };
        
        return res.status(200).json(ApiResponse.success({ code: "LIKE200", message: "좋아요 취소가 완료되었습니다.", result }));

    } catch (error) {
        return res.status(500).json(ApiResponse.fail({ code: "LOOKS500", message: error.message }));
    }
};