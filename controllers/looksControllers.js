const { Post, Like, Image, User } = require('../models');
const { ApiResponse } = require('../response');
const { Op } = require('sequelize');

// 필터링/정렬된 일반 목록 조회
exports.getLooks = async (req, res) => {
    try {
        const { sort = 'latest', page = 1, limit = 20, sido, gungu, date, weather } = req.query;

        const where = {};
        if (sido) where.sido = sido;
        if (gungu) where.gungu = gungu;
        if (date) where.createdAt = { [Op.between]: [new Date(date), new Date(new Date(date).setDate(new Date(date).getDate() + 1))] };
        if (weather) where.weather = weather;

        const paginatedResult = await Post.findAndCountAll({
            where,
            order: [sort === 'popular' ? ['like_count', 'DESC'] : ['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (page - 1) * parseInt(limit),
            include: [{ model: Image, attributes: ['imageUrl'] }]
        });
        
        const result = {
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalPosts: paginatedResult.count,
                totalPages: Math.ceil(paginatedResult.count / limit)
            },
            looks: paginatedResult.rows
        };
        
        return res.status(200).json(ApiResponse.success({ message: "룩 목록 조회 성공", result }));

    } catch (error) {
        console.error(error);
        return res.status(500).json(ApiResponse.fail({ message: error.message }));
    }
};

// BEST 10 게시물 조회
exports.getBestLooks = async (req, res) => {
    try {
        const bestLooks = await Post.findAll({
            order: [['like_count', 'DESC']], 
            limit: 10,
            include: [{ model: Image, attributes: ['imageUrl'] }]
        });

        return res.status(200).json(ApiResponse.success({ message: "인기 게시물(Best 10) 조회 성공", result: bestLooks }));

    } catch (error) {
        console.error(error);
        return res.status(500).json(ApiResponse.fail({ message: error.message }));
    }
};

// 게시물 상세 조회
exports.getLookDetail = async (req, res) => {
    try {
        const { looktoday_id } = req.params; 
        const post = await Post.findByPk(looktoday_id, {
            include: [
                { model: User, attributes: ['nickname'] },
                { model: Image, attributes: ['imageUrl'] }
            ]
        });

        if (!post) {
            return res.status(404).json(ApiResponse.fail({ code: "LOOKS404", message: "해당 게시물을 찾을 수 없습니다." }));
        }
        
        const result = {
            lookId: post.looktoday_id,
            nickname: post.User ? post.User.nickname : null,
            imageUrl: post.Image ? post.Image.imageUrl : null,
            location: `${post.sido || ''} ${post.gungu || ''}`.trim(),
            apparentTemp: post.apparent_temp,
            comment: post.comment,
            date: post.createdAt,
            likeCount: post.like_count,
            isLiked: false
        };

        return res.status(200).json(ApiResponse.success({ code: "LOOKS201", message: "게시물 상세 조회에 성공했습니다.", result }));

    } catch (error) {
        console.error(error);
        return res.status(500).json(ApiResponse.fail({ message: error.message }));
    }
};

// 좋아요
exports.likePost = async (req, res) => {
    try {
        const { looktoday_id } = req.params; 
        const user_id = req.user.user_id; 
        const existingLike = await Like.findOne({
            where: { user_id: user_id, looktoday_id: looktoday_id }
        });

        if (existingLike) {
            return res.status(409).json(ApiResponse.fail({ code: "LIKE409", message: "이미 좋아요를 누른 게시물입니다." }));
        }

        await Like.create({ user_id: user_id, looktoday_id: looktoday_id });
        await Post.increment('like_count', { where: { looktoday_id: looktoday_id } });

        const result = {
            looktoday_id: parseInt(looktoday_id),
            user_id: user_id,
            isLiked: true
        };
        
        return res.status(201).json(ApiResponse.success({ code: "LIKE201", message: "좋아요 처리가 완료되었습니다.", result }));

    } catch (error) {
        console.error(error);
        return res.status(500).json(ApiResponse.fail({ code: "LOOKS500", message: error.message }));
    }
};

// 좋아요 취소
exports.unlikePost = async (req, res) => {
    try {
        const { looktoday_id } = req.params; 
        const user_id = req.user.user_id;  

        const existingLike = await Like.findOne({
            where: { user_id: user_id, looktoday_id: looktoday_id }
        });

        if (!existingLike) {
            return res.status(404).json(ApiResponse.fail({ code: "LIKE404", message: "좋아요 기록을 찾을 수 없습니다." }));
        }

        await existingLike.destroy();
        await Post.decrement('like_count', { where: { looktoday_id: looktoday_id } });
        
        const result = {
            looktoday_id: parseInt(looktoday_id),
            user_id: user_id,
            isLiked: false
        };
        
        return res.status(200).json(ApiResponse.success({ code: "LIKE200", message: "좋아요 취소가 완료되었습니다.", result }));

    } catch (error) {
        console.error(error);
        return res.status(500).json(ApiResponse.fail({ code: "LOOKS500", message: error.message }));
    }
};