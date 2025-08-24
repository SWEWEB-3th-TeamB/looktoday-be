const { Post, Like, Image, User, Weather } = require('../models');
const { ApiResponse } = require('../response');
const { Op } = require('sequelize');

// weather에서 온도를 가져오는 함수
const parseTemperature = (description) => {
    if (!description || typeof description !== 'string') return null;
    const tempMatch = description.match(/-?\d+(\.\d+)?/);
    return tempMatch ? parseFloat(tempMatch[0]) : null;
};

// 필터링/정렬된 일반 목록 조회
exports.getLooks = async (req, res) => {
    try {
        const { sort = 'latest', page = 1, limit = 20, si, gungu, date, weather, minTemp, maxTemp } = req.query;

        const where = {};
        if (si) where.si = si;
        if (gungu) where.gungu = gungu;
        if (date) where.createdAt = { [Op.between]: [new Date(date), new Date(new Date(date).setDate(new Date(date).getDate() + 1))] };

        const order = [sort === 'popular' ? ['like_count', 'DESC'] : ['createdAt', 'DESC']];

        let allMatchingPosts = await Post.findAll({
            where,
            order,
            include: [
                { model: Image, attributes: ['imageUrl'] },
                { model: Weather, as: 'Weather', attributes: ['description'] }
            ]
        });

        //날씨 필터 적용
        if (weather && weather != '전체') {
            allMatchingPosts = allMatchingPosts.filter(post => {
                const description = post.Weather?.description; 
                const temp = parseTemperature(description);

                if (temp === null) return false;

                switch (weather) {
                    case '-16°C 이하': return temp <= -16;
                    case '-15 ~ -11°C': return temp >= -15 && temp <= -11;
                    case '-10 ~ -6°C': return temp >= -10 && temp <= -6;
                    case '-5 ~ -1°C': return temp >= -5 && temp <= -1;
                    case '0 ~ 5°C': return temp >= 0 && temp <= 5;
                    case '6 ~ 11°C': return temp >= 6 && temp <= 11;
                    case '12 ~ 16°C': return temp >= 12 && temp <= 16;
                    case '17 ~ 20°C': return temp >= 17 && temp <= 20;
                    case '20 ~ 26°C': return temp >= 20 && temp <= 26;
                    case '27 ~ 33°C': return temp >= 27 && temp <= 33;
                    case '34°C 이상': return temp >= 34;
                    case 'custom':
                        const min = parseFloat(minTemp);
                        const max = parseFloat(maxTemp);
                        const isMinValid = !isNaN(min);
                        const isMaxValid = !isNaN(max);
                        if (isMinValid && isMaxValid) return temp >= min && temp <= max;
                        if (isMinValid) return temp >= min;
                        if (isMaxValid) return temp <= max;
                        return false;
                    default: return false;
                }
            });
        }

        const totalPosts = allMatchingPosts.length;
        const totalPages = Math.ceil(totalPosts / limit);
        const offset = (page - 1) * parseInt(limit);
        const paginatedPosts = allMatchingPosts.slice(offset, offset + parseInt(limit));
        
        const result = {
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalPosts: totalPosts,
                totalPages: totalPages
            },
            looks: paginatedPosts
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
                { model: Image, attributes: ['imageUrl'] },
                { model: Weather, as: 'Weather', attributes: ['description'] }
            ]
        });

        if (!post) {
            return res.status(404).json(ApiResponse.fail({ code: "LOOKS404", message: "해당 게시물을 찾을 수 없습니다." }));
        }

        let isLiked = false;

        const user_id = req.user?.id;

        if (user_id) {
            const existingLike = await Like.findOne({
                where: {
                    user_id: user_id,
                    looktoday_id: post.looktoday_id
                }
            });
            // 좋아요 기록이 존재하면 isLiked를 true로 변경
            if (existingLike) {
                isLiked = true;
            }
        }

        const weatherInfo = post.Weather ? post.Weather.description : null;
        
        const result = {
            lookId: post.looktoday_id,
            nickname: post.User ? post.User.nickname : null,
            imageUrl: post.Image ? post.Image.imageUrl : null,
            location: `${post.si || ''} ${post.gungu || ''}`.trim(),
            apparentTemp: post.apparent_temp,
            weather: weatherInfo, 
            comment: post.comment,
            date: post.createdAt,
            likeCount: post.like_count,
            isLiked: isLiked
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
